import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessSubscriptionBillingCycle,
  BusinessSubscriptionPaymentDirection,
  BusinessSubscriptionPaymentSource,
  BusinessSubscriptionPaymentType,
  Prisma,
  SubscriptionPaymentStatus,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  BusinessSubscriptionPaymentDto,
  ListSubscriptionPaymentsQueryDto,
  RecordPaymentDto,
  RefundPaymentDto,
  SubscriptionPaymentsListDto,
} from '../dto/business-subscription-payment.dto';
import {
  BusinessSubscriptionPaymentRepository,
  CreateSubscriptionPaymentInput,
} from '../repositories/business-subscription-payment.repository';

@Injectable()
export class BusinessSubscriptionPaymentService {
  constructor(
    private readonly paymentRepository: BusinessSubscriptionPaymentRepository,
  ) {}

  async recordPayment(
    tx: Prisma.TransactionClient,
    businessId: string,
    dto: RecordPaymentDto,
    actor: RequestUser,
    overrides?: Partial<CreateSubscriptionPaymentInput>,
  ) {
    const subscription = await tx.businessSubscription.findUnique({
      where: { businessId },
    });

    const paymentStatus =
      dto.paymentStatus ??
      (dto.paidAt ? SubscriptionPaymentStatus.PAID : SubscriptionPaymentStatus.PENDING);

    return this.paymentRepository.create(
      {
        businessId,
        subscriptionId: subscription?.id,
        amount: dto.amount,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        paymentStatus,
        paymentType:
          dto.paymentType ?? BusinessSubscriptionPaymentType.MANUAL_PAYMENT,
        billingCycle:
          dto.billingCycle ?? BusinessSubscriptionBillingCycle.ONE_TIME,
        direction: BusinessSubscriptionPaymentDirection.INCOMING,
        source: dto.source ?? BusinessSubscriptionPaymentSource.ADMIN,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paidAt: dto.paidAt
          ? new Date(dto.paidAt)
          : paymentStatus === SubscriptionPaymentStatus.PAID
            ? new Date()
            : undefined,
        paymentReference: dto.paymentReference,
        notes: dto.notes,
        createdById: actor.id,
        ...overrides,
      },
      tx,
    );
  }

  async voidPayment(
    paymentId: string,
    reason: string,
    actor: RequestUser,
  ): Promise<BusinessSubscriptionPaymentDto> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Payment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (payment.paymentStatus === SubscriptionPaymentStatus.PAID) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Paid payment records cannot be voided. Use refund instead.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (payment.voidedAt) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment is already voided',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.paymentRepository.update(paymentId, {
      voidedAt: new Date(),
      voidReason: reason,
      notes: payment.notes
        ? `${payment.notes}\nVoided by ${actor.email}: ${reason}`
        : `Voided by ${actor.email}: ${reason}`,
    });

    return this.toDto(updated);
  }

  async recordRefundOrCredit(
    tx: Prisma.TransactionClient,
    originalPaymentId: string,
    dto: RefundPaymentDto,
    actor: RequestUser,
  ) {
    const original = await tx.businessSubscriptionPayment.findUnique({
      where: { id: originalPaymentId },
    });

    if (!original) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Original payment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (original.paymentStatus !== SubscriptionPaymentStatus.PAID) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Only paid payments can be refunded',
        HttpStatus.BAD_REQUEST,
      );
    }

    const refundAmount = dto.amount;
    const originalAmount = Number(original.amount);
    if (refundAmount > originalAmount) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Refund amount cannot exceed original payment',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.paymentRepository.create(
      {
        businessId: original.businessId,
        subscriptionId: original.subscriptionId,
        amount: refundAmount,
        currency: original.currency,
        paymentMethod: original.paymentMethod,
        paymentStatus: SubscriptionPaymentStatus.REFUNDED,
        paymentType:
          dto.paymentType ?? BusinessSubscriptionPaymentType.REFUND,
        billingCycle: original.billingCycle,
        direction: BusinessSubscriptionPaymentDirection.OUTGOING,
        source: BusinessSubscriptionPaymentSource.ADMIN,
        paidAt: new Date(),
        notes: dto.notes,
        metadata: { originalPaymentId },
        createdById: actor.id,
      },
      tx,
    );
  }

  async listPayments(
    businessId: string,
    query: ListSubscriptionPaymentsQueryDto,
  ): Promise<SubscriptionPaymentsListDto> {
    const limit = query.limit ?? 20;
    const rows = await this.paymentRepository.findMany({
      businessId,
      paymentStatus: query.paymentStatus,
      paymentMethod: query.paymentMethod,
      paymentType: query.paymentType,
      paymentDirection: query.paymentDirection,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      includeVoided: query.includeVoided,
      cursor: query.cursor,
      limit,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: items.map((row) => this.toDto(row)),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      hasMore,
    };
  }

  async getLatestPaymentAt(businessId: string): Promise<Date | null> {
    return this.paymentRepository.findLatestPaidAt(businessId);
  }

  toDto(
    row: Awaited<ReturnType<BusinessSubscriptionPaymentRepository['findById']>> &
      object,
  ): BusinessSubscriptionPaymentDto {
    return {
      id: row.id,
      businessId: row.businessId,
      subscriptionId: row.subscriptionId,
      amount: row.amount.toString(),
      currency: row.currency,
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      paymentType: row.paymentType,
      billingCycle: row.billingCycle,
      direction: row.direction,
      source: row.source,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      dueDate: row.dueDate,
      paidAt: row.paidAt,
      recordedAt: row.recordedAt,
      voidedAt: row.voidedAt,
      voidReason: row.voidReason,
      paymentReference: row.paymentReference,
      notes: row.notes,
      metadata: row.metadata as Record<string, unknown> | null,
      externalProvider: row.externalProvider,
      externalPaymentId: row.externalPaymentId,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
