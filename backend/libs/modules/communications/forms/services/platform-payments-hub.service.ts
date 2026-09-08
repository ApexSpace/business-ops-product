import { Injectable } from '@nestjs/common';
import {
  FormPaymentAttemptStatus,
  FormPaymentRail,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { getPaginationParams } from '@app/common/utils/pagination.util';

export type PlatformPaymentHubSource = 'SAAS_SUBSCRIPTION' | 'FORM';

export type PlatformPaymentHubRow = {
  id: string;
  source: PlatformPaymentHubSource;
  sourceLabel: string;
  amount: string;
  currency: string;
  status: string;
  livemode: boolean;
  paidAt: string | null;
  createdAt: string;
  contextTitle: string;
  contextSubtitle?: string;
  contextHref?: string;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  externalPaymentId?: string | null;
};

@Injectable()
export class PlatformPaymentsHubService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    page?: number;
    limit?: number;
    source?: PlatformPaymentHubSource;
    status?: string;
    q?: string;
    livemode?: boolean;
  }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const source = query.source;
    const search = query.q?.trim().toLowerCase() || '';

    const [saasRows, formRows] = await Promise.all([
      !source || source === 'SAAS_SUBSCRIPTION'
        ? this.loadSaasRows({ search, status: query.status, livemode: query.livemode })
        : Promise.resolve([] as PlatformPaymentHubRow[]),
      !source || source === 'FORM'
        ? this.loadFormRows({ search, status: query.status, livemode: query.livemode })
        : Promise.resolve([] as PlatformPaymentHubRow[]),
    ]);

    const merged = [...saasRows, ...formRows].sort((a, b) => {
      const aTime = Date.parse(a.paidAt ?? a.createdAt);
      const bTime = Date.parse(b.paidAt ?? b.createdAt);
      return bTime - aTime;
    });

    const total = merged.length;
    const items = merged.slice(skip, skip + take);

    return {
      items,
      meta: { total, page, limit },
    };
  }

  private async loadSaasRows(params: {
    search: string;
    status?: string;
    livemode?: boolean;
  }): Promise<PlatformPaymentHubRow[]> {
    // SaaS payments are always live platform money; skip when filtering test-only.
    if (params.livemode === false) return [];

    const where: Prisma.BusinessSubscriptionPaymentWhereInput = {};
    if (params.status) {
      where.paymentStatus = params.status as never;
    }
    if (params.search) {
      where.OR = [
        { business: { name: { contains: params.search, mode: 'insensitive' } } },
        { paymentReference: { contains: params.search, mode: 'insensitive' } },
        { notes: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.businessSubscriptionPayment.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: 500,
      include: {
        business: { select: { id: true, name: true } },
        subscription: {
          select: {
            planTier: { select: { name: true } },
          },
        },
      },
    });

    return rows.map((row) => {
      const planName = row.subscription?.planTier?.name ?? null;
      const cycle = row.billingCycle;
      return {
        id: `saas:${row.id}`,
        source: 'SAAS_SUBSCRIPTION' as const,
        sourceLabel: 'SaaS subscription',
        amount: row.amount.toString(),
        currency: row.currency,
        status: row.paymentStatus,
        livemode: true,
        paidAt: row.paidAt?.toISOString() ?? null,
        createdAt: row.recordedAt.toISOString(),
        contextTitle: row.business.name,
        contextSubtitle: [planName, cycle].filter(Boolean).join(' · ') || undefined,
        contextHref: `/platform/businesses/${row.businessId}?tab=payments`,
        payerName: null,
        payerEmail: null,
        payerPhone: null,
        externalPaymentId: row.externalPaymentId,
      };
    });
  }

  private async loadFormRows(params: {
    search: string;
    status?: string;
    livemode?: boolean;
  }): Promise<PlatformPaymentHubRow[]> {
    const where: Prisma.FormPaymentAttemptWhereInput = {
      rail: FormPaymentRail.PLATFORM,
    };
    if (typeof params.livemode === 'boolean') {
      where.livemode = params.livemode;
    }
    if (params.status) {
      where.status = params.status as FormPaymentAttemptStatus;
    }
    if (params.search) {
      where.OR = [
        { form: { name: { contains: params.search, mode: 'insensitive' } } },
        { payerEmail: { contains: params.search, mode: 'insensitive' } },
        { payerName: { contains: params.search, mode: 'insensitive' } },
        { payerPhone: { contains: params.search, mode: 'insensitive' } },
        {
          stripePaymentIntentId: {
            contains: params.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const rows = await this.prisma.formPaymentAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        form: { select: { id: true, name: true } },
      },
    });

    return rows.map((row) => {
      const orphan =
        row.status === FormPaymentAttemptStatus.SUCCEEDED_PENDING_SUBMISSION;
      return {
        id: `form:${row.id}`,
        source: 'FORM' as const,
        sourceLabel: 'Form payment',
        amount: (row.amountCents / 100).toFixed(2),
        currency: row.currency,
        status: row.status,
        livemode: row.livemode,
        paidAt:
          row.status === FormPaymentAttemptStatus.SUCCEEDED ||
          row.status === FormPaymentAttemptStatus.SUCCEEDED_PENDING_SUBMISSION
            ? row.updatedAt.toISOString()
            : null,
        createdAt: row.createdAt.toISOString(),
        contextTitle: row.form.name,
        contextSubtitle: orphan
          ? 'Payment succeeded — submission pending'
          : row.formSubmissionId
            ? 'Submission linked'
            : undefined,
        contextHref: `/platform/forms/${row.formId}/submissions`,
        payerName: row.payerName,
        payerEmail: row.payerEmail,
        payerPhone: row.payerPhone,
        externalPaymentId: row.stripePaymentIntentId,
      };
    });
  }
}
