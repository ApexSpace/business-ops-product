import { Injectable } from '@nestjs/common';
import { EstimateStatus, InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { PaymentsOverviewDto } from '../dto/payments-overview.dto';

@Injectable()
export class PaymentsOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(businessId: string): Promise<PaymentsOverviewDto> {
    const startOfToday = this.startOfTodayUtc();

    const activeInvoice: Prisma.InvoiceWhereInput = {
      businessId,
      deletedAt: null,
    };

    const activeEstimate: Prisma.EstimateWhereInput = {
      businessId,
      deletedAt: null,
    };

    const activePayment: Prisma.PaymentWhereInput = {
      businessId,
      deletedAt: null,
    };

    const overdueInvoiceWhere: Prisma.InvoiceWhereInput = {
      ...activeInvoice,
      balanceDue: { gt: 0 },
      status: { not: InvoiceStatus.VOID },
      OR: [
        { status: InvoiceStatus.OVERDUE },
        { dueDate: { lt: startOfToday } },
      ],
    };

    const dueInvoiceWhere: Prisma.InvoiceWhereInput = {
      ...activeInvoice,
      balanceDue: { gt: 0 },
      status: {
        notIn: [InvoiceStatus.VOID, InvoiceStatus.OVERDUE, InvoiceStatus.PAID],
      },
      AND: [
        {
          OR: [{ dueDate: null }, { dueDate: { gte: startOfToday } }],
        },
      ],
    };

    const linkedEstimateIds = await this.prisma.invoice.findMany({
      where: {
        ...activeInvoice,
        estimateId: { not: null },
      },
      select: { estimateId: true },
      distinct: ['estimateId'],
    });

    const convertedEstimateIds = linkedEstimateIds
      .map((row) => row.estimateId)
      .filter((id): id is string => id !== null);

    const convertedEstimateWhere: Prisma.EstimateWhereInput = {
      ...activeEstimate,
      OR: [
        { status: EstimateStatus.CONVERTED },
        ...(convertedEstimateIds.length > 0
          ? [{ id: { in: convertedEstimateIds } }]
          : []),
      ],
    };

    const [
      draftAgg,
      dueAgg,
      overdueAgg,
      paymentsAgg,
      paidInvoices,
      paymentInvoiceRows,
      sentAgg,
      approvedAgg,
      rejectedAgg,
      convertedAgg,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { ...activeInvoice, status: InvoiceStatus.DRAFT },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: dueInvoiceWhere,
        _count: { _all: true },
        _sum: { balanceDue: true },
      }),
      this.prisma.invoice.aggregate({
        where: overdueInvoiceWhere,
        _count: { _all: true },
        _sum: { balanceDue: true },
      }),
      this.prisma.payment.aggregate({
        where: activePayment,
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.invoice.findMany({
        where: { ...activeInvoice, status: InvoiceStatus.PAID },
        select: { id: true },
      }),
      this.prisma.payment.findMany({
        where: activePayment,
        select: { invoiceId: true },
        distinct: ['invoiceId'],
      }),
      this.prisma.estimate.aggregate({
        where: { ...activeEstimate, status: EstimateStatus.SENT },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.estimate.aggregate({
        where: { ...activeEstimate, status: EstimateStatus.APPROVED },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.estimate.aggregate({
        where: { ...activeEstimate, status: EstimateStatus.REJECTED },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.estimate.aggregate({
        where: convertedEstimateWhere,
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
    ]);

    const receivedInvoiceIds = new Set<string>([
      ...paidInvoices.map((inv) => inv.id),
      ...paymentInvoiceRows.map((row) => row.invoiceId),
    ]);

    return {
      invoices: {
        draft: this.metric(draftAgg._count._all, draftAgg._sum.totalAmount),
        due: this.metric(dueAgg._count._all, dueAgg._sum.balanceDue),
        received: {
          count: receivedInvoiceIds.size,
          amount: this.decimalString(paymentsAgg._sum.amount),
        },
        overdue: this.metric(overdueAgg._count._all, overdueAgg._sum.balanceDue),
      },
      estimates: {
        sent: this.metric(sentAgg._count._all, sentAgg._sum.totalAmount),
        approved: this.metric(
          approvedAgg._count._all,
          approvedAgg._sum.totalAmount,
        ),
        rejected: this.metric(
          rejectedAgg._count._all,
          rejectedAgg._sum.totalAmount,
        ),
        converted: this.metric(
          convertedAgg._count._all,
          convertedAgg._sum.totalAmount,
        ),
      },
    };
  }

  private metric(
    count: number,
    amount: Prisma.Decimal | null | undefined,
  ): { count: number; amount: string } {
    return {
      count,
      amount: this.decimalString(amount),
    };
  }

  private decimalString(value: Prisma.Decimal | null | undefined): string {
    if (!value) {
      return '0.00';
    }
    return value.toFixed(2);
  }

  private startOfTodayUtc(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
