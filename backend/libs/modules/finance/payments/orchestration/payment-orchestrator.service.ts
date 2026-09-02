import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ContactWalletTransactionType,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PayableType,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { StripeCheckoutService } from '@app/modules/integrations/integrations/stripe/services/stripe-checkout.service';
import { StripePaymentIntentService } from '@app/modules/integrations/integrations/stripe/services/stripe-payment-intent.service';
import { InvoiceRepository } from '@app/modules/finance/invoices/repositories/invoice.repository';
import {
  buildInvoicePublicUrl,
  generateInvoicePublicToken,
} from '@app/modules/finance/invoices/utils/invoice-public-token.util';
import { STRIPE_PAYMENT_PURPOSE } from '../constants/stripe-payment-purpose.constants';
import { PayableHandlerRegistry } from '../registry/payable-handler.registry';
import { ContactPaymentMethodsService } from '../services/contact-payment-methods.service';
import { PaymentRealtimeService } from '../services/payment-realtime.service';
import { WalletLedgerService } from '../services/wallet-ledger.service';
import { GiftCardRedemptionService } from '@app/modules/finance/gift-cards/services/gift-card-redemption.service';
import type {
  CollectPaymentInput,
  CollectPaymentResult,
  PaymentCompleteContext,
  RedirectTenderResult,
} from '../types/payable.types';

@Injectable()
export class PaymentOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PayableHandlerRegistry,
    private readonly walletLedger: WalletLedgerService,
    private readonly stripePaymentIntent: StripePaymentIntentService,
    private readonly stripeCheckout: StripeCheckoutService,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly contactPaymentMethods: ContactPaymentMethodsService,
    private readonly paymentRealtime: PaymentRealtimeService,
    private readonly auditService: AuditService,
    private readonly giftCardRedemption: GiftCardRedemptionService,
  ) {}

  async collectPayment(
    input: CollectPaymentInput,
  ): Promise<CollectPaymentResult> {
    const handler = this.registry.get(input.payableType);
    const snapshot = await handler.resolvePayable(
      input.businessId,
      input.payableId,
    );

    const amountDue = new Prisma.Decimal(snapshot.amountDue);
    const tipAllowance = new Prisma.Decimal(
      (input.tipAmount ?? 0).toFixed(2),
    );
    const maxTenderTotal = amountDue.add(tipAllowance);
    const tenderTotal = input.tenders.reduce(
      (sum, t) => sum.add(new Prisma.Decimal(t.amount.toFixed(2))),
      new Prisma.Decimal(0),
    );

    if (tenderTotal.lessThanOrEqualTo(0)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'At least one tender with a positive amount is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tenderTotal.greaterThan(maxTenderTotal)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Tender total exceeds amount due',
        HttpStatus.BAD_REQUEST,
      );
    }

    const paymentIds: string[] = [];
    const stripeTenders: CollectPaymentResult['stripeTenders'] = [];
    const redirectTenders: RedirectTenderResult[] = [];

    for (const tender of input.tenders) {
      const amount = new Prisma.Decimal(tender.amount.toFixed(2));
      if (amount.lessThanOrEqualTo(0)) continue;

      if (
        tender.method === PaymentMethod.CASH ||
        tender.method === PaymentMethod.BANK_TRANSFER ||
        tender.method === PaymentMethod.CARD ||
        tender.method === PaymentMethod.CHECK ||
        tender.method === PaymentMethod.OTHER
      ) {
        const payment = await this.createManualPayment({
          input,
          snapshot,
          tender,
          amount,
          method: tender.method,
        });
        paymentIds.push(payment.id);
        continue;
      }

      if (tender.method === PaymentMethod.WALLET) {
        const payment = await this.createWalletPayment({
          input,
          snapshot,
          tender,
          amount,
        });
        paymentIds.push(payment.id);
        continue;
      }

      if (tender.method === PaymentMethod.GIFT_CARD) {
        const payment = await this.createGiftCardPayment({
          input,
          snapshot,
          tender,
          amount,
        });
        paymentIds.push(payment.id);
        continue;
      }

      if (tender.method === PaymentMethod.STRIPE) {
        if (input.stripeMode === 'REDIRECT') {
          const redirectResult = await this.createStripeRedirectPayment({
            input,
            snapshot,
            tender,
            amount,
          });
          paymentIds.push(redirectResult.paymentId);
          redirectTenders.push(redirectResult);
          continue;
        }

        const stripeResult = await this.createStripeEmbeddedPayment({
          input,
          snapshot,
          tender,
          amount,
          contactPaymentMethodId: tender.contactPaymentMethodId,
        });
        paymentIds.push(stripeResult.paymentId);
        if (!stripeResult.succeededImmediately) {
          stripeTenders.push(stripeResult);
        }
        continue;
      }

      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Unsupported payment method: ${tender.method}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const pending = await this.prisma.payment.count({
      where: {
        businessId: input.businessId,
        payableType: input.payableType,
        payableId: input.payableId,
        deletedAt: null,
        status: PaymentStatus.PENDING,
      },
    });
    const completed = pending === 0;

    if (completed) {
      await this.completePayable({
        businessId: input.businessId,
        payableType: input.payableType,
        payableId: input.payableId,
        contactId: snapshot.contactId,
        actorUserId: input.actorUserId,
      });
      await this.paymentRealtime.publishPaymentCollected(input.businessId, {
        payableType: input.payableType,
        payableId: input.payableId,
        invoiceId: snapshot.invoiceId,
        contactId: snapshot.contactId,
        paymentId: paymentIds[paymentIds.length - 1],
      });
    }

    await this.auditService.log({
      actorUserId: input.actorUserId!,
      businessId: input.businessId,
      action: completed ? 'payment.collected' : 'payment.collection.started',
      entityType: 'Payment',
      entityId: input.payableId,
      metadata: {
        payableType: input.payableType,
        paymentIds,
        tenderCount: input.tenders.length,
        completed,
        stripeMode: input.stripeMode,
      },
    });

    return {
      payableType: input.payableType,
      payableId: input.payableId,
      completed,
      paymentIds,
      stripeTenders,
      redirectTenders,
    };
  }

  async finalizeStripePaymentIntent(
    paymentIntentId: string,
    chargeId?: string | null,
    paymentId?: string | null,
  ): Promise<void> {
    let payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId, deletedAt: null },
    });
    if (!payment && paymentId) {
      payment = await this.prisma.payment.findFirst({
        where: { id: paymentId, deletedAt: null },
      });
    }
    if (!payment || payment.status === PaymentStatus.SUCCEEDED) {
      return;
    }

    if (!payment.stripePaymentIntentId) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { stripePaymentIntentId: paymentIntentId },
      });
    }

    const paidAt = new Date();
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        paidAt,
        stripeChargeId: chargeId ?? payment.stripeChargeId,
      },
    });

    const handler = this.registry.get(payment.payableType);
    if (handler.syncPayablePayments) {
      await handler.syncPayablePayments(payment.businessId, payment.payableId);
    }

    const pending = await this.prisma.payment.count({
      where: {
        businessId: payment.businessId,
        payableType: payment.payableType,
        payableId: payment.payableId,
        deletedAt: null,
        status: PaymentStatus.PENDING,
      },
    });

    if (pending === 0) {
      await this.completePayable({
        businessId: payment.businessId,
        payableType: payment.payableType,
        payableId: payment.payableId,
        contactId: payment.contactId,
      });
      await this.paymentRealtime.publishPaymentCollected(payment.businessId, {
        paymentId: payment.id,
        payableType: payment.payableType,
        payableId: payment.payableId,
        invoiceId: payment.invoiceId,
        contactId: payment.contactId,
      });
    }
  }

  private async completePayable(ctx: PaymentCompleteContext): Promise<void> {
    const handler = this.registry.get(ctx.payableType);
    await handler.onPaymentComplete(ctx);
  }

  private resolveInvoiceId(
    payableType: PayableType,
    payableId: string,
    snapshotInvoiceId?: string,
  ): string {
    if (payableType === PayableType.INVOICE) {
      return snapshotInvoiceId ?? payableId;
    }
    if (!snapshotInvoiceId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invoice id required for this payable',
        HttpStatus.BAD_REQUEST,
      );
    }
    return snapshotInvoiceId;
  }

  private async createManualPayment(params: {
    input: CollectPaymentInput;
    snapshot: { contactId: string; invoiceId?: string };
    tender: CollectPaymentInput['tenders'][number];
    amount: Prisma.Decimal;
    method: PaymentMethod;
  }) {
    const invoiceId = this.resolveInvoiceId(
      params.input.payableType,
      params.input.payableId,
      params.snapshot.invoiceId,
    );
    const paidAt = new Date();

    return this.prisma.payment.create({
      data: {
        business: { connect: { id: params.input.businessId } },
        invoice: { connect: { id: invoiceId } },
        contact: { connect: { id: params.snapshot.contactId } },
        payableType: params.input.payableType,
        payableId: params.input.payableId,
        amount: params.amount,
        method: params.method,
        status: PaymentStatus.SUCCEEDED,
        provider: PaymentProvider.MANUAL,
        reference: params.tender.reference?.trim() || null,
        notes: params.tender.notes?.trim() || null,
        paidAt,
        createdBy: params.input.actorUserId
          ? { connect: { id: params.input.actorUserId } }
          : undefined,
      },
    });
  }

  private async createWalletPayment(params: {
    input: CollectPaymentInput;
    snapshot: { contactId: string; invoiceId?: string };
    tender: CollectPaymentInput['tenders'][number];
    amount: Prisma.Decimal;
  }) {
    const invoiceId = this.resolveInvoiceId(
      params.input.payableType,
      params.input.payableId,
      params.snapshot.invoiceId,
    );

    const payment = await this.prisma.payment.create({
      data: {
        business: { connect: { id: params.input.businessId } },
        invoice: { connect: { id: invoiceId } },
        contact: { connect: { id: params.snapshot.contactId } },
        payableType: params.input.payableType,
        payableId: params.input.payableId,
        amount: params.amount,
        method: PaymentMethod.WALLET,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.MANUAL,
        reference: params.tender.reference?.trim() || null,
        notes: params.tender.notes?.trim() || null,
        createdBy: params.input.actorUserId
          ? { connect: { id: params.input.actorUserId } }
          : undefined,
      },
    });

    const walletTxId = await this.walletLedger.debit({
      businessId: params.input.businessId,
      contactId: params.snapshot.contactId,
      amount: params.amount,
      type: ContactWalletTransactionType.SALE_PAYMENT,
      description: `Payment for ${params.input.payableType} ${params.input.payableId}`,
      paymentId: payment.id,
      invoiceId,
      createdById: params.input.actorUserId,
    });

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: new Date(),
        walletTransactionId: walletTxId,
      },
    });
  }

  private async createGiftCardPayment(params: {
    input: CollectPaymentInput;
    snapshot: { contactId: string; invoiceId?: string };
    tender: CollectPaymentInput['tenders'][number];
    amount: Prisma.Decimal;
  }) {
    if (!params.tender.giftCardId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'giftCardId is required for gift card payments',
        HttpStatus.BAD_REQUEST,
      );
    }

    const invoiceId = this.resolveInvoiceId(
      params.input.payableType,
      params.input.payableId,
      params.snapshot.invoiceId,
    );

    const redemption = await this.giftCardRedemption.redeem(
      params.input.businessId,
      params.tender.giftCardId,
      Number(params.amount.toString()),
      invoiceId,
    );

    return this.prisma.payment.create({
      data: {
        business: { connect: { id: params.input.businessId } },
        invoice: { connect: { id: invoiceId } },
        contact: { connect: { id: params.snapshot.contactId } },
        payableType: params.input.payableType,
        payableId: params.input.payableId,
        amount: new Prisma.Decimal(redemption.amountApplied),
        method: PaymentMethod.GIFT_CARD,
        status: PaymentStatus.SUCCEEDED,
        provider: PaymentProvider.MANUAL,
        giftCard: { connect: { id: params.tender.giftCardId } },
        reference: params.tender.reference?.trim() || null,
        notes: params.tender.notes?.trim() || null,
        paidAt: new Date(),
        createdBy: params.input.actorUserId
          ? { connect: { id: params.input.actorUserId } }
          : undefined,
      },
    });
  }

  private async createStripeEmbeddedPayment(params: {
    input: CollectPaymentInput;
    snapshot: {
      contactId: string;
      description: string;
      currency: string;
      invoiceId?: string;
    };
    tender: CollectPaymentInput['tenders'][number];
    amount: Prisma.Decimal;
    contactPaymentMethodId?: string;
  }) {
    const invoiceId = this.resolveInvoiceId(
      params.input.payableType,
      params.input.payableId,
      params.snapshot.invoiceId,
    );

    const payment = await this.prisma.payment.create({
      data: {
        business: { connect: { id: params.input.businessId } },
        invoice: { connect: { id: invoiceId } },
        contact: { connect: { id: params.snapshot.contactId } },
        payableType: params.input.payableType,
        payableId: params.input.payableId,
        amount: params.amount,
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        notes: params.tender.notes?.trim() || null,
        contactPaymentMethod: params.contactPaymentMethodId
          ? { connect: { id: params.contactPaymentMethodId } }
          : undefined,
        createdBy: params.input.actorUserId
          ? { connect: { id: params.input.actorUserId } }
          : undefined,
      },
    });

    let stripePaymentMethodId: string | undefined;
    if (params.contactPaymentMethodId) {
      const saved =
        await this.contactPaymentMethods.requirePaymentMethodForCharge(
          params.input.businessId,
          params.snapshot.contactId,
          params.contactPaymentMethodId,
        );
      stripePaymentMethodId = saved.stripePaymentMethodId;
    }

    const amountCents = Math.round(Number(params.amount.toString()) * 100);
    const purpose =
      params.input.payableType === PayableType.INVOICE
        ? STRIPE_PAYMENT_PURPOSE.INVOICE_COLLECT
        : STRIPE_PAYMENT_PURPOSE.CHECKOUT;

    const intent = await this.stripePaymentIntent.createForPayment({
      businessId: params.input.businessId,
      contactId: params.snapshot.contactId,
      amountCents,
      currency: params.snapshot.currency,
      description: params.snapshot.description,
      paymentId: payment.id,
      payableType: params.input.payableType,
      payableId: params.input.payableId,
      purpose,
      invoiceId,
      channel: params.input.channel,
      stripePaymentMethodId,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { stripePaymentIntentId: intent.paymentIntentId },
    });

    if (intent.succeeded) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED, paidAt: new Date() },
      });
      const handler = this.registry.get(params.input.payableType);
      if (handler.syncPayablePayments) {
        await handler.syncPayablePayments(
          params.input.businessId,
          params.input.payableId,
        );
      }
      return {
        paymentId: payment.id,
        clientSecret: intent.clientSecret,
        stripePaymentIntentId: intent.paymentIntentId,
        succeededImmediately: true,
      };
    }

    return {
      paymentId: payment.id,
      clientSecret: intent.clientSecret,
      stripePaymentIntentId: intent.paymentIntentId,
      succeededImmediately: false,
    };
  }

  private async createStripeRedirectPayment(params: {
    input: CollectPaymentInput;
    snapshot: {
      contactId: string;
      description: string;
      currency: string;
      invoiceId?: string;
    };
    tender: CollectPaymentInput['tenders'][number];
    amount: Prisma.Decimal;
  }): Promise<RedirectTenderResult> {
    const invoiceId = this.resolveInvoiceId(
      params.input.payableType,
      params.input.payableId,
      params.snapshot.invoiceId,
    );

    const invoice = await this.invoiceRepository.findById(
      params.input.businessId,
      invoiceId,
    );
    if (!invoice) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const publicToken =
      invoice.publicToken ??
      (
        await this.invoiceRepository.update(
          params.input.businessId,
          invoiceId,
          { publicToken: generateInvoicePublicToken() },
        )
      )?.publicToken;

    if (!publicToken) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Could not prepare invoice for redirect checkout',
        HttpStatus.BAD_REQUEST,
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        business: { connect: { id: params.input.businessId } },
        invoice: { connect: { id: invoiceId } },
        contact: { connect: { id: params.snapshot.contactId } },
        payableType: params.input.payableType,
        payableId: params.input.payableId,
        amount: params.amount,
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        notes: params.tender.notes?.trim() || null,
        createdBy: params.input.actorUserId
          ? { connect: { id: params.input.actorUserId } }
          : undefined,
      },
    });

    const amountCents = Math.round(Number(params.amount.toString()) * 100);
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';
    const publicUrl = buildInvoicePublicUrl(frontendUrl, publicToken);

    const { sessionId, url } =
      await this.stripeCheckout.createInvoiceCheckoutSession(
        invoiceId,
        params.input.businessId,
        {
          amountCents,
          currency: params.snapshot.currency.toLowerCase(),
          contactId: params.snapshot.contactId,
          description: params.snapshot.description,
          publicToken,
          paymentId: payment.id,
          successUrl: `${frontendUrl}/business/invoices?payment=success`,
          cancelUrl: `${frontendUrl}/business/invoices?payment=cancelled`,
        },
      );

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { stripeCheckoutSessionId: sessionId },
    });

    await this.invoiceRepository.update(params.input.businessId, invoiceId, {
      stripeCheckoutUrl: url,
      stripePaymentLinkId: sessionId,
      publicUrl,
    });

    return {
      paymentId: payment.id,
      checkoutUrl: url,
      sessionId,
    };
  }
}
