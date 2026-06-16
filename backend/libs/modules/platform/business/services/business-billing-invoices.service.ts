import { Injectable } from '@nestjs/common';
import {
  BusinessSubscriptionPaymentType,
  Prisma,
  SubscriptionBillingSource,
  SubscriptionPaymentStatus,
} from '@prisma/client';
import { StripePlatformApiService } from '@app/modules/platform/billing/stripe/services/stripe-platform-api.service';
import { StripePlatformMetadataService } from '@app/modules/platform/billing/stripe/services/stripe-platform-metadata.service';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  BusinessBillingInvoiceDto,
  BusinessBillingInvoicesListDto,
  ListBusinessBillingInvoicesQueryDto,
} from '../dto/business-billing-invoice.dto';
import { BusinessSubscriptionPaymentRepository } from '../repositories/business-subscription-payment.repository';

type StripeBillingInvoice = {
  id?: string;
  created?: number;
  amount_paid?: number | null;
  amount_due?: number | null;
  currency?: string | null;
  status?: string | null;
  hosted_invoice_url?: string | null;
  subscription?: string | { id?: string } | null;
  parent?: {
    subscription_details?: {
      subscription?: string | { id?: string } | null;
    } | null;
  } | null;
  lines?: {
    data?: Array<{ description?: string | null }>;
  };
  status_transitions?: { paid_at?: number | null };
};

type PlanNames = {
  planGroupName: string | null;
  planTierName: string | null;
};

type SubscriptionPlanContext = {
  metadata: Prisma.JsonValue;
  planGroup: { name: string } | null;
  planTier: { name: string } | null;
} | null;

@Injectable()
export class BusinessBillingInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: BusinessSubscriptionPaymentRepository,
    private readonly stripeApiService: StripePlatformApiService,
    private readonly metadataService: StripePlatformMetadataService,
  ) {}

  async listCurrentInvoices(
    businessId: string,
    query: ListBusinessBillingInvoicesQueryDto,
  ): Promise<BusinessBillingInvoicesListDto> {
    const subscription = await this.findSubscriptionContext(businessId);

    const billingSource =
      subscription?.billingSource ?? SubscriptionBillingSource.NOT_SELECTED;

    if (billingSource === SubscriptionBillingSource.STRIPE) {
      return this.listStripeInvoices(businessId, subscription, query, {
        scope: 'current-subscription',
      });
    }

    return this.listLocalInvoices(
      businessId,
      billingSource,
      subscription,
      query,
    );
  }

  async listAllInvoicesForBusiness(
    businessId: string,
    query: ListBusinessBillingInvoicesQueryDto,
  ): Promise<BusinessBillingInvoicesListDto> {
    const subscription = await this.findSubscriptionContext(businessId);

    const billingSource =
      subscription?.billingSource ?? SubscriptionBillingSource.NOT_SELECTED;

    if (billingSource === SubscriptionBillingSource.STRIPE) {
      return this.listStripeInvoices(businessId, subscription, query, {
        scope: 'all',
      });
    }

    return this.listLocalInvoices(
      businessId,
      billingSource,
      subscription,
      query,
      { includePlanDetails: true },
    );
  }

  private findSubscriptionContext(businessId: string) {
    return this.prisma.businessSubscription.findUnique({
      where: { businessId },
      include: {
        planGroup: { select: { name: true } },
        planTier: { select: { name: true } },
      },
    });
  }

  private async listStripeInvoices(
    businessId: string,
    subscription: SubscriptionPlanContext,
    query: ListBusinessBillingInvoicesQueryDto,
    options: { scope: 'current-subscription' | 'all' },
  ): Promise<BusinessBillingInvoicesListDto> {
    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription?.metadata,
    );
    const customerId = stripeMeta?.customerId;
    const subscriptionId = stripeMeta?.subscriptionId;
    const stripeConfigured = this.stripeApiService.isConfigured();

    if (!customerId || !stripeConfigured) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    if (options.scope === 'current-subscription' && !subscriptionId) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const limit = query.limit ?? 20;
    const stripe = this.stripeApiService.getClient();

    const response = await stripe.invoices.list({
      customer: customerId,
      ...(options.scope === 'current-subscription' && subscriptionId
        ? { subscription: subscriptionId }
        : {}),
      limit: limit + 1,
      ...(query.cursor ? { starting_after: query.cursor } : {}),
    });

    const currentPlanNames: PlanNames = {
      planGroupName: subscription?.planGroup?.name ?? null,
      planTierName: subscription?.planTier?.name ?? null,
    };

    let rows = (response.data ?? []) as StripeBillingInvoice[];

    if (options.scope === 'current-subscription' && subscriptionId) {
      rows = this.filterInvoicesBySubscription(rows, subscriptionId);
    }

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const planNamesBySubscriptionId =
      options.scope === 'all'
        ? await this.resolveStripeInvoicePlanNames(page)
        : new Map<string, PlanNames>();

    const items = page.map((invoice) => {
      const invoiceSubscriptionId =
        this.resolveStripeInvoiceSubscriptionId(invoice);
      const planNames =
        options.scope === 'all'
          ? invoiceSubscriptionId
            ? (planNamesBySubscriptionId.get(invoiceSubscriptionId) ?? {
                planGroupName: null,
                planTierName: null,
              })
            : { planGroupName: null, planTierName: null }
          : currentPlanNames;

      return this.mapStripeInvoice(
        invoice,
        planNames.planTierName,
        businessId,
        planNames,
      );
    });

    return {
      items,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  private async resolveStripeInvoicePlanNames(
    invoices: StripeBillingInvoice[],
  ): Promise<Map<string, PlanNames>> {
    const subscriptionIds = [
      ...new Set(
        invoices
          .map((invoice) => this.resolveStripeInvoiceSubscriptionId(invoice))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (subscriptionIds.length === 0) {
      return new Map();
    }

    const stripe = this.stripeApiService.getClient();
    const planRefs = await Promise.all(
      subscriptionIds.map(async (subscriptionId) => {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          return {
            subscriptionId,
            planGroupId: sub.metadata?.planGroupId,
            planTierId: sub.metadata?.planTierId,
          };
        } catch {
          return { subscriptionId, planGroupId: undefined, planTierId: undefined };
        }
      }),
    );

    const planGroupIds = [
      ...new Set(
        planRefs
          .map((ref) => ref.planGroupId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const planTierIds = [
      ...new Set(
        planRefs
          .map((ref) => ref.planTierId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [planGroups, planTiers] = await Promise.all([
      planGroupIds.length > 0
        ? this.prisma.planGroup.findMany({
            where: { id: { in: planGroupIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      planTierIds.length > 0
        ? this.prisma.planTier.findMany({
            where: { id: { in: planTierIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const planGroupNameById = new Map(
      planGroups.map((group) => [group.id, group.name]),
    );
    const planTierNameById = new Map(
      planTiers.map((tier) => [tier.id, tier.name]),
    );

    const result = new Map<string, PlanNames>();

    for (const ref of planRefs) {
      result.set(ref.subscriptionId, {
        planGroupName: ref.planGroupId
          ? (planGroupNameById.get(ref.planGroupId) ?? null)
          : null,
        planTierName: ref.planTierId
          ? (planTierNameById.get(ref.planTierId) ?? null)
          : null,
      });
    }

    return result;
  }

  private filterInvoicesBySubscription(
    invoices: StripeBillingInvoice[],
    subscriptionId: string,
  ): StripeBillingInvoice[] {
    const matching: StripeBillingInvoice[] = [];

    for (const invoice of invoices) {
      const invoiceSubscriptionId =
        this.resolveStripeInvoiceSubscriptionId(invoice);

      if (!invoiceSubscriptionId) {
        continue;
      }

      if (invoiceSubscriptionId !== subscriptionId) {
        continue;
      }

      matching.push(invoice);
    }

    return matching;
  }

  private resolveStripeInvoiceSubscriptionId(
    invoice: StripeBillingInvoice,
  ): string | null {
    if (typeof invoice.subscription === 'string') {
      return invoice.subscription;
    }

    if (invoice.subscription && typeof invoice.subscription === 'object') {
      return invoice.subscription.id ?? null;
    }

    const parentSubscription =
      invoice.parent?.subscription_details?.subscription;

    if (typeof parentSubscription === 'string') {
      return parentSubscription;
    }

    if (parentSubscription && typeof parentSubscription === 'object') {
      return parentSubscription.id ?? null;
    }

    return null;
  }

  private mapStripeInvoice(
    invoice: StripeBillingInvoice,
    planName: string | null,
    businessId: string,
    planNames: PlanNames = { planGroupName: null, planTierName: planName },
  ): BusinessBillingInvoiceDto {
    const amountCents =
      invoice.amount_paid && invoice.amount_paid > 0
        ? invoice.amount_paid
        : (invoice.amount_due ?? 0);
    const paidAt = invoice.status_transitions?.paid_at;
    const dateSeconds = paidAt ?? invoice.created ?? 0;

    const lineDescription = invoice.lines?.data?.find((line) =>
      line.description?.trim(),
    )?.description;

    return {
      id: invoice.id ?? `${businessId}-stripe-invoice`,
      date: new Date(dateSeconds * 1000),
      amount: new Prisma.Decimal(amountCents).div(100).toFixed(2),
      currency: (invoice.currency ?? 'usd').toUpperCase(),
      status: this.mapStripeInvoiceStatus(invoice.status),
      description: lineDescription ?? planName ?? 'Subscription',
      billingSource: SubscriptionBillingSource.STRIPE,
      stripeHostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      planGroupName: planNames.planGroupName,
      planTierName: planNames.planTierName ?? planName,
    };
  }

  private mapStripeInvoiceStatus(status?: string | null): string {
    switch (status) {
      case 'paid':
        return SubscriptionPaymentStatus.PAID;
      case 'open':
        return SubscriptionPaymentStatus.PENDING;
      case 'uncollectible':
        return SubscriptionPaymentStatus.FAILED;
      case 'void':
        return SubscriptionPaymentStatus.REFUNDED;
      case 'draft':
        return SubscriptionPaymentStatus.PENDING;
      default:
        return SubscriptionPaymentStatus.PENDING;
    }
  }

  private async listLocalInvoices(
    businessId: string,
    billingSource: SubscriptionBillingSource,
    subscription: SubscriptionPlanContext,
    query: ListBusinessBillingInvoicesQueryDto,
    options: { includePlanDetails?: boolean } = {},
  ): Promise<BusinessBillingInvoicesListDto> {
    const limit = query.limit ?? 20;
    const rows = await this.paymentRepository.findMany({
      businessId,
      includeVoided: true,
      includePlanDetails: options.includePlanDetails,
      cursor: query.cursor,
      limit,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const defaultPlanNames: PlanNames = {
      planGroupName: subscription?.planGroup?.name ?? null,
      planTierName: subscription?.planTier?.name ?? null,
    };

    const items = page.map((row) =>
      this.mapLocalPayment(row, billingSource, defaultPlanNames),
    );

    return {
      items,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  private mapLocalPayment(
    row: {
      id: string;
      amount: Prisma.Decimal;
      currency: string;
      paymentStatus: SubscriptionPaymentStatus;
      paymentType: BusinessSubscriptionPaymentType;
      billingCycle: string;
      paidAt: Date | null;
      recordedAt: Date;
      notes: string | null;
      voidedAt: Date | null;
      subscription?: {
        planGroup: { name: string } | null;
        planTier: { name: string } | null;
      } | null;
    },
    billingSource: SubscriptionBillingSource,
    defaultPlanNames: PlanNames,
  ): BusinessBillingInvoiceDto {
    const planNames: PlanNames = row.subscription
      ? {
          planGroupName: row.subscription.planGroup?.name ?? null,
          planTierName: row.subscription.planTier?.name ?? null,
        }
      : defaultPlanNames;

    const description =
      row.notes?.trim() ||
      this.formatPaymentTypeDescription(row.paymentType, row.billingCycle) ||
      planNames.planTierName ||
      'Subscription payment';

    return {
      id: row.id,
      date: row.paidAt ?? row.recordedAt,
      amount: row.amount.toString(),
      currency: row.currency,
      status: row.voidedAt
        ? SubscriptionPaymentStatus.REFUNDED
        : row.paymentStatus,
      description,
      billingSource,
      stripeHostedInvoiceUrl: null,
      planGroupName: planNames.planGroupName,
      planTierName: planNames.planTierName,
    };
  }

  private formatPaymentTypeDescription(
    paymentType: BusinessSubscriptionPaymentType,
    billingCycle: string,
  ): string {
    const typeLabel = paymentType
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const cycleLabel = billingCycle
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return `${typeLabel} (${cycleLabel})`;
  }
}
