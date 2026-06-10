import { Injectable, Logger } from '@nestjs/common';
import {
  InvoicePaymentStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentProvider,
  Prisma,
} from '@prisma/client';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  StripeWebhookEvent,
  StripeWebhookMetadata,
} from '@app/modules/integrations/integrations/stripe/stripe.types';
import { computeInvoicePaymentSyncFields } from '@app/modules/finance/payments/utils/invoice-payment-sync.util';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import {
  formatContactName,
  formatMoney,
} from '@app/modules/communications/email/utils/email-variables.util';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { DateTime } from 'luxon';

type CheckoutSessionObject = {
  id?: string;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | { id?: string } | null;
  payment_status?: string | null;
  metadata?: StripeWebhookMetadata;
};

type PaymentIntentObject = {
  id?: string;
  amount?: number | null;
  amount_received?: number | null;
  currency?: string | null;
  latest_charge?: string | { id?: string } | null;
  metadata?: StripeWebhookMetadata;
  last_payment_error?: { message?: string } | null;
};

type ChargeObject = {
  id?: string;
  amount?: number | null;
  amount_refunded?: number | null;
  currency?: string | null;
  payment_intent?: string | { id?: string } | null;
  metadata?: StripeWebhookMetadata;
};

@Injectable()
export class StripeInvoicePaymentService {
  private readonly logger = new Logger(StripeInvoicePaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly businessRepository: BusinessRepository,
  ) {}

  async handleCheckoutSessionCompleted(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const session = event.data.object as CheckoutSessionObject;
    await this.recordStripePaymentFromSession(
      session,
      event.id,
      'checkout.session.completed',
    );
  }

  async handlePaymentIntentSucceeded(event: StripeWebhookEvent): Promise<void> {
    const intent = event.data.object as PaymentIntentObject;
    const metadata = intent.metadata ?? null;
    const sessionId =
      typeof metadata?.checkoutSessionId === 'string'
        ? metadata.checkoutSessionId
        : null;
    if (sessionId) {
      const existing = await this.prisma.payment.findFirst({
        where: { stripeCheckoutSessionId: sessionId, deletedAt: null },
      });
      if (existing) {
        return;
      }
    }
    await this.recordStripePaymentFromIntent(intent, event.id);
  }

  async handlePaymentIntentFailed(event: StripeWebhookEvent): Promise<void> {
    const intent = event.data.object as PaymentIntentObject;
    const metadata = intent.metadata ?? null;
    const businessId = metadata?.businessId;
    const invoiceId = metadata?.invoiceId;
    if (!businessId) return;

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId,
      action: 'invoice.payment.failed',
      entityType: invoiceId ? 'Invoice' : 'Payment',
      entityId: invoiceId ?? event.id,
      metadata: {
        eventId: event.id,
        eventType: event.type,
        paymentIntentId: intent.id ?? null,
        message: intent.last_payment_error?.message ?? null,
        provider: 'stripe',
      },
    });
  }

  async handleChargeRefunded(event: StripeWebhookEvent): Promise<void> {
    const charge = event.data.object as ChargeObject;
    const metadata = charge.metadata ?? null;
    const businessId = metadata?.businessId;
    const invoiceId = metadata?.invoiceId;
    if (!businessId || !invoiceId) {
      this.logger.warn(
        `charge.refunded: missing metadata for event ${event.id}`,
      );
      return;
    }

    const paymentIntentId = this.resolveId(charge.payment_intent);
    const payment = paymentIntentId
      ? await this.prisma.payment.findFirst({
          where: {
            businessId,
            invoiceId,
            stripePaymentIntentId: paymentIntentId,
            deletedAt: null,
          },
        })
      : null;

    if (payment) {
      const refundedCents = charge.amount_refunded ?? charge.amount ?? null;
      const amountRefunded =
        refundedCents != null
          ? (Number(refundedCents) / 100).toFixed(2)
          : payment.amount.toFixed(2);

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripeRefundId: charge.id ?? payment.stripeRefundId,
          providerMetadata: {
            ...(typeof payment.providerMetadata === 'object' &&
            payment.providerMetadata !== null
              ? (payment.providerMetadata as Record<string, unknown>)
              : {}),
            refundedAt: new Date().toISOString(),
            amountRefunded,
          },
        },
      });
    }

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId,
      action: 'invoice.refunded',
      entityType: 'Invoice',
      entityId: invoiceId,
      metadata: {
        eventId: event.id,
        chargeId: charge.id ?? null,
        paymentIntentId,
        provider: 'stripe',
      },
    });
  }

  private async recordStripePaymentFromSession(
    session: CheckoutSessionObject,
    eventId: string,
    eventType: string,
  ): Promise<void> {
    const sessionId = session.id;
    if (!sessionId) return;

    if (session.payment_status && session.payment_status !== 'paid') {
      return;
    }

    const metadata = session.metadata ?? null;
    const businessId = metadata?.businessId;
    const invoiceId = metadata?.invoiceId;
    if (!businessId || !invoiceId) {
      this.logger.warn(
        `${eventType}: missing businessId/invoiceId metadata (${eventId})`,
      );
      return;
    }

    const existing = await this.prisma.payment.findFirst({
      where: { stripeCheckoutSessionId: sessionId, deletedAt: null },
    });
    if (existing) {
      return;
    }

    const amountCents = session.amount_total ?? 0;
    if (amountCents <= 0) return;

    const amount = new Prisma.Decimal(amountCents).div(100);
    const paymentIntentId = this.resolveId(session.payment_intent);

    await this.createStripePayment({
      businessId,
      invoiceId,
      contactId: metadata?.contactId || undefined,
      amount,
      sessionId,
      paymentIntentId,
      currency: session.currency ?? undefined,
      eventId,
      eventType,
    });
  }

  private async recordStripePaymentFromIntent(
    intent: PaymentIntentObject,
    eventId: string,
  ): Promise<void> {
    const metadata = intent.metadata ?? null;
    const businessId = metadata?.businessId;
    const invoiceId = metadata?.invoiceId;
    if (!businessId || !invoiceId) return;

    const paymentIntentId = intent.id;
    if (!paymentIntentId) return;

    const existing = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId, deletedAt: null },
    });
    if (existing) return;

    const amountCents = intent.amount_received ?? intent.amount ?? 0;
    if (amountCents <= 0) return;

    const amount = new Prisma.Decimal(amountCents).div(100);
    const chargeId = this.resolveId(intent.latest_charge);

    await this.createStripePayment({
      businessId,
      invoiceId,
      contactId: metadata?.contactId || undefined,
      amount,
      sessionId:
        typeof metadata?.checkoutSessionId === 'string'
          ? metadata.checkoutSessionId
          : null,
      paymentIntentId,
      chargeId,
      currency: intent.currency ?? undefined,
      eventId,
      eventType: 'payment_intent.succeeded',
    });
  }

  private async createStripePayment(params: {
    businessId: string;
    invoiceId: string;
    contactId?: string;
    amount: Prisma.Decimal;
    sessionId: string | null;
    paymentIntentId: string | null;
    chargeId?: string | null;
    currency?: string;
    eventId: string;
    eventType: string;
  }): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: params.invoiceId,
        businessId: params.businessId,
        deletedAt: null,
      },
    });

    if (!invoice) {
      this.logger.warn(`Stripe payment: invoice ${params.invoiceId} not found`);
      return;
    }

    if (invoice.status === InvoiceStatus.VOID) {
      return;
    }

    if (
      invoice.paymentStatus === InvoicePaymentStatus.PAID &&
      invoice.balanceDue.lessThanOrEqualTo(0)
    ) {
      this.logger.warn(
        `Stripe payment ignored: invoice ${params.invoiceId} already paid`,
      );
      return;
    }

    const contactId = params.contactId || invoice.contactId;
    const paidAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          business: { connect: { id: params.businessId } },
          invoice: { connect: { id: params.invoiceId } },
          contact: { connect: { id: contactId } },
          amount: params.amount,
          method: PaymentMethod.STRIPE,
          provider: PaymentProvider.STRIPE,
          reference: params.paymentIntentId,
          paidAt,
          stripeCheckoutSessionId: params.sessionId,
          stripePaymentIntentId: params.paymentIntentId,
          stripeChargeId: params.chargeId ?? null,
          providerMetadata: {
            currency: params.currency ?? null,
            stripeEventId: params.eventId,
            stripeEventType: params.eventType,
          },
        },
      });

      await this.syncInvoicePayments(tx, params.businessId, params.invoiceId);

      await tx.invoice.update({
        where: { id: params.invoiceId },
        data: {
          stripeCheckoutUrl: null,
          stripePaymentLinkId: null,
        },
      });
    });

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: params.businessId,
      action: 'invoice.payment.received',
      entityType: 'Invoice',
      entityId: params.invoiceId,
      metadata: {
        amount: params.amount.toFixed(2),
        paymentIntentId: params.paymentIntentId,
        checkoutSessionId: params.sessionId,
        provider: 'stripe',
        eventId: params.eventId,
      },
    });

    void this.sendPaidReceiptEmail({
      businessId: params.businessId,
      invoiceId: params.invoiceId,
      amount: params.amount,
      paidAt,
      idempotencyKey: `invoice-paid-stripe-${params.eventId}`,
    }).catch((err) => {
      this.logger.warn(
        `Paid receipt email enqueue failed for invoice ${params.invoiceId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  private async sendPaidReceiptEmail(params: {
    businessId: string;
    invoiceId: string;
    amount: Prisma.Decimal;
    paidAt: Date;
    idempotencyKey: string;
  }): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: params.invoiceId,
        businessId: params.businessId,
        deletedAt: null,
      },
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    const contactEmail = invoice?.contact?.email?.trim();
    if (!invoice || !contactEmail) {
      return;
    }

    const business = await this.businessRepository.findById(params.businessId);

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId: params.businessId,
      emailType: 'invoice.paid_receipt',
      toEmail: contactEmail,
      contactId: invoice.contactId,
      entityType: 'Invoice',
      entityId: invoice.id,
      idempotencyKey: params.idempotencyKey,
      variables: {
        'business.name': business?.name ?? 'Business',
        'contact.name': formatContactName(invoice.contact),
        'invoice.number': invoice.invoiceNumber,
        'payment.amount': formatMoney(params.amount),
        'payment.date': DateTime.fromJSDate(params.paidAt).toFormat(
          'LLL d, yyyy',
        ),
      },
    });
  }

  private async syncInvoicePayments(
    tx: Prisma.TransactionClient,
    businessId: string,
    invoiceId: string,
  ): Promise<void> {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, businessId, deletedAt: null },
    });
    if (!invoice) return;

    const payments = await tx.payment.findMany({
      where: { businessId, invoiceId, deletedAt: null },
      select: { amount: true, paidAt: true },
    });

    const sync = computeInvoicePaymentSyncFields(invoice, payments);

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        balanceDue: sync.balanceDue,
        status: sync.status,
        paymentStatus: sync.paymentStatus,
        paidAmount: sync.paidAmount,
        remainingAmount: sync.remainingAmount,
        lastPaymentAt: sync.lastPaymentAt,
      },
    });
  }

  private resolveId(
    value: string | { id?: string } | null | undefined,
  ): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.id ?? null;
  }
}
