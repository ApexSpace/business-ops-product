import { HttpStatus, Injectable } from '@nestjs/common';
import { InvoiceStatus, PaymentProvider, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { InvoiceRepository } from '@app/modules/finance/invoices/repositories/invoice.repository';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { ListPaymentsQueryDto } from '../dto/list-payments-query.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { toPaymentResponse } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import {
  computeInvoicePaymentSyncFields,
  sumPaymentAmounts,
} from '../utils/invoice-payment-sync.util';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { StripeApiService } from '@app/modules/integrations/integrations/stripe/services/stripe-api.service';
import { assertStripeReadyForPayments } from '@app/modules/integrations/integrations/stripe/utils/stripe-readiness.util';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import {
  formatContactName,
  formatMoney,
} from '@app/modules/communications/email/utils/email-variables.util';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { DateTime } from 'luxon';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly stripeApiService: StripeApiService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly businessRepository: BusinessRepository,
  ) {}

  async create(
    businessId: string,
    dto: CreatePaymentDto,
    actor: RequestUser,
  ): Promise<PaymentResponseDto> {
    const invoice = await this.assertPayableInvoice(businessId, dto.invoiceId);
    const amount = new Prisma.Decimal(dto.amount.toFixed(2));
    await this.assertAmountWithinBalance(
      businessId,
      dto.invoiceId,
      amount,
      invoice.balanceDue,
    );

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          business: { connect: { id: businessId } },
          invoice: { connect: { id: dto.invoiceId } },
          contact: { connect: { id: invoice.contactId } },
          amount,
          method: dto.method,
          reference: dto.reference?.trim() || null,
          notes: dto.notes?.trim() || null,
          paidAt: new Date(dto.paidAt),
          createdBy: { connect: { id: actor.id } },
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
              phoneCountryCode: true,
              phoneNumber: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              balanceDue: true,
              status: true,
            },
          },
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      await this.syncInvoiceInTransaction(tx, businessId, dto.invoiceId);
      return created;
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'payment.created',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: { invoiceId: dto.invoiceId, amount: amount.toFixed(2) },
    });

    void this.sendPaidReceiptEmail(
      businessId,
      payment,
      amount,
      new Date(dto.paidAt),
    ).catch(() => undefined);

    const refreshed = await this.paymentRepository.findById(
      businessId,
      payment.id,
    );
    return toPaymentResponse(refreshed ?? payment);
  }

  async list(
    businessId: string,
    query: ListPaymentsQueryDto,
  ): Promise<{
    items: PaymentResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.paymentRepository.findMany(businessId, {
      skip,
      take,
      search: query.search?.trim() || undefined,
      invoiceId: query.invoiceId,
      contactId: query.contactId,
      method: query.method,
      paidFrom: query.paidFrom ? new Date(query.paidFrom) : undefined,
      paidTo: query.paidTo ? this.endOfDay(new Date(query.paidTo)) : undefined,
    });

    return {
      items: items.map(toPaymentResponse),
      meta: { total, page, limit },
    };
  }

  async getById(businessId: string, id: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findById(businessId, id);
    if (!payment) {
      throw new AppException(
        ErrorCode.PAYMENT_NOT_FOUND,
        'Payment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toPaymentResponse(payment);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdatePaymentDto,
    actor: RequestUser,
  ): Promise<PaymentResponseDto> {
    const existing = await this.paymentRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.PAYMENT_NOT_FOUND,
        'Payment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const nextInvoiceId = dto.invoiceId ?? existing.invoiceId;
    const invoiceChanged = nextInvoiceId !== existing.invoiceId;
    const previousInvoiceId = existing.invoiceId;

    const invoice = await this.assertPayableInvoice(businessId, nextInvoiceId);

    const nextAmount =
      dto.amount !== undefined
        ? new Prisma.Decimal(dto.amount.toFixed(2))
        : existing.amount;

    if (dto.amount !== undefined || invoiceChanged) {
      const invoiceForLimit = invoiceChanged
        ? invoice
        : await this.assertPayableInvoice(businessId, nextInvoiceId);
      const otherPayments = await this.paymentRepository.findActiveByInvoiceId(
        businessId,
        nextInvoiceId,
        id,
      );
      const otherPaid = sumPaymentAmounts(otherPayments);
      const maxAllowed = invoiceForLimit.totalAmount.sub(otherPaid);
      if (nextAmount.greaterThan(maxAllowed)) {
        throw new AppException(
          ErrorCode.PAYMENT_AMOUNT_INVALID,
          `Payment amount cannot exceed remaining balance (${maxAllowed.toFixed(2)})`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const data: Prisma.PaymentUpdateInput = {};
    if (dto.invoiceId !== undefined) {
      data.invoice = { connect: { id: dto.invoiceId } };
      data.contact = { connect: { id: invoice.contactId } };
    }
    if (dto.amount !== undefined) {
      data.amount = nextAmount;
    }
    if (dto.method !== undefined) {
      data.method = dto.method;
    }
    if (dto.paidAt !== undefined) {
      data.paidAt = new Date(dto.paidAt);
    }
    if (dto.reference !== undefined) {
      data.reference = dto.reference?.trim() || null;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data,
        include: {
          contact: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
              phoneCountryCode: true,
              phoneNumber: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              balanceDue: true,
              status: true,
            },
          },
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      await this.syncInvoiceInTransaction(tx, businessId, nextInvoiceId);
      if (invoiceChanged) {
        await this.syncInvoiceInTransaction(tx, businessId, previousInvoiceId);
      }

      return updated;
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'payment.updated',
      entityType: 'Payment',
      entityId: id,
    });

    const refreshed = await this.paymentRepository.findById(businessId, id);
    return toPaymentResponse(refreshed ?? payment);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<PaymentResponseDto> {
    const existing = await this.paymentRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.PAYMENT_NOT_FOUND,
        'Payment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.syncInvoiceInTransaction(tx, businessId, existing.invoiceId);
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'payment.deleted',
      entityType: 'Payment',
      entityId: id,
    });

    return toPaymentResponse(existing);
  }

  async refund(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<PaymentResponseDto> {
    const existing = await this.paymentRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.PAYMENT_NOT_FOUND,
        'Payment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (this.isPaymentRefunded(existing)) {
      throw new AppException(
        ErrorCode.PAYMENT_ALREADY_REFUNDED,
        'This transaction has already been refunded',
        HttpStatus.BAD_REQUEST,
      );
    }

    const refundedAmount = existing.amount.toFixed(2);

    if (
      existing.provider === PaymentProvider.STRIPE &&
      existing.stripePaymentIntentId
    ) {
      await this.refundStripePayment(
        businessId,
        existing.stripePaymentIntentId,
      );
      await this.markPaymentRefunded(
        id,
        existing.providerMetadata,
        refundedAmount,
      );
      await this.auditService.log({
        actorUserId: actor.id,
        businessId,
        action: 'payment.refunded',
        entityType: 'Payment',
        entityId: id,
        metadata: { provider: 'stripe', amountRefunded: refundedAmount },
      });
      const refreshed = await this.paymentRepository.findById(businessId, id);
      return toPaymentResponse(refreshed ?? existing);
    }

    await this.markPaymentRefunded(
      id,
      existing.providerMetadata,
      refundedAmount,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'payment.refunded',
      entityType: 'Payment',
      entityId: id,
      metadata: { provider: 'manual', amountRefunded: refundedAmount },
    });

    const refreshed = await this.paymentRepository.findById(businessId, id);
    return toPaymentResponse(refreshed ?? existing);
  }

  private async markPaymentRefunded(
    paymentId: string,
    existingMetadata: Prisma.JsonValue | null,
    amountRefunded: string,
  ): Promise<void> {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        providerMetadata: this.buildRefundedMetadata(
          existingMetadata,
          amountRefunded,
        ),
      },
    });
  }

  private buildRefundedMetadata(
    existingMetadata: Prisma.JsonValue | null,
    amountRefunded: string,
  ): Prisma.InputJsonValue {
    const base =
      existingMetadata &&
      typeof existingMetadata === 'object' &&
      !Array.isArray(existingMetadata)
        ? (existingMetadata as Record<string, unknown>)
        : {};
    return {
      ...base,
      refundedAt: new Date().toISOString(),
      amountRefunded,
    };
  }

  private isPaymentRefunded(payment: {
    stripeRefundId: string | null;
    providerMetadata: Prisma.JsonValue | null;
  }): boolean {
    if (payment.stripeRefundId) {
      return true;
    }
    if (
      payment.providerMetadata &&
      typeof payment.providerMetadata === 'object' &&
      !Array.isArray(payment.providerMetadata)
    ) {
      const meta = payment.providerMetadata as Record<string, unknown>;
      return !!meta.refundedAt;
    }
    return false;
  }

  private async refundStripePayment(
    businessId: string,
    paymentIntentId: string,
  ): Promise<void> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    const config = assertStripeReadyForPayments(integration);
    const stripe = this.stripeApiService.getClient();

    try {
      await stripe.refunds.create(
        { payment_intent: paymentIntentId },
        { stripeAccount: config.stripeAccountId },
      );
    } catch (error) {
      this.stripeApiService.logStripeError('refund.create', error);
      throw new AppException(
        ErrorCode.PAYMENT_REFUND_FAILED,
        'Could not refund this payment through Stripe. Try again or refund in the Stripe Dashboard.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async syncInvoiceInTransaction(
    tx: Prisma.TransactionClient,
    businessId: string,
    invoiceId: string,
  ): Promise<void> {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, businessId, deletedAt: null },
    });
    if (!invoice) {
      return;
    }

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

  private async assertPayableInvoice(businessId: string, invoiceId: string) {
    const invoice = await this.invoiceRepository.findById(
      businessId,
      invoiceId,
    );
    if (!invoice) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (invoice.status === InvoiceStatus.VOID) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_PAYABLE,
        'Cannot record payments on a void invoice',
        HttpStatus.BAD_REQUEST,
      );
    }
    return invoice;
  }

  private async assertAmountWithinBalance(
    businessId: string,
    invoiceId: string,
    amount: Prisma.Decimal,
    balanceDue: Prisma.Decimal,
    excludePaymentId?: string,
  ): Promise<void> {
    if (amount.greaterThan(balanceDue)) {
      throw new AppException(
        ErrorCode.PAYMENT_AMOUNT_INVALID,
        `Payment amount cannot exceed remaining balance (${balanceDue.toFixed(2)})`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (amount.lessThanOrEqualTo(0)) {
      throw new AppException(
        ErrorCode.PAYMENT_AMOUNT_INVALID,
        'Payment amount must be greater than zero',
        HttpStatus.BAD_REQUEST,
      );
    }
    void excludePaymentId;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private async sendPaidReceiptEmail(
    businessId: string,
    payment: {
      id: string;
      contact: {
        id: string;
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
        companyName: string | null;
        email: string | null;
      };
      invoice: { id: string; invoiceNumber: string };
    },
    amount: Prisma.Decimal,
    paidAt: Date,
  ): Promise<void> {
    const contactEmail = payment.contact.email?.trim();
    if (!contactEmail) {
      return;
    }

    const business = await this.businessRepository.findById(businessId);

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId,
      emailType: 'invoice.paid_receipt',
      toEmail: contactEmail,
      contactId: payment.contact.id,
      entityType: 'Payment',
      entityId: payment.id,
      idempotencyKey: `invoice-paid-manual-${payment.id}`,
      variables: {
        'business.name': business?.name ?? 'Business',
        'contact.name': formatContactName(payment.contact),
        'invoice.number': payment.invoice.invoiceNumber,
        'payment.amount': formatMoney(amount),
        'payment.date': DateTime.fromJSDate(paidAt).toFormat('LLL d, yyyy'),
      },
    });
  }
}
