import { HttpStatus, Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { getPaginationParams } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { InvoiceRepository } from '../../invoices/repositories/invoice.repository';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { ListPaymentsQueryDto } from '../dto/list-payments-query.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { toPaymentResponse } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import {
  computeBalanceDue,
  invoiceStatusFromPayments,
  sumPaymentAmounts,
} from '../utils/invoice-payment-sync.util';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
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
    const { items, total } = await this.paymentRepository.findMany(
      businessId,
      {
        skip,
        take,
        search: query.search?.trim() || undefined,
        invoiceId: query.invoiceId,
        contactId: query.contactId,
        method: query.method,
        paidFrom: query.paidFrom ? new Date(query.paidFrom) : undefined,
        paidTo: query.paidTo
          ? this.endOfDay(new Date(query.paidTo))
          : undefined,
      },
    );

    return {
      items: items.map(toPaymentResponse),
      meta: { total, page, limit },
    };
  }

  async getById(
    businessId: string,
    id: string,
  ): Promise<PaymentResponseDto> {
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
        await this.syncInvoiceInTransaction(
          tx,
          businessId,
          previousInvoiceId,
        );
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
      await this.syncInvoiceInTransaction(
        tx,
        businessId,
        existing.invoiceId,
      );
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
      select: { amount: true },
    });

    const totalPaid = sumPaymentAmounts(payments);
    const balanceDue = computeBalanceDue(invoice.totalAmount, totalPaid);
    const status = invoiceStatusFromPayments(
      invoice.status,
      invoice.totalAmount,
      totalPaid,
    );

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { balanceDue, status },
    });
  }

  private async assertPayableInvoice(businessId: string, invoiceId: string) {
    const invoice = await this.invoiceRepository.findById(businessId, invoiceId);
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
}
