import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  ClientMembershipStatus,
  ContactWalletTransactionType,
  MembershipBillingEventType,
  MembershipPlanType,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { DomainEventBusService } from '@app/modules/communications/automations/services/domain-event-bus.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { assertStripeReadyForPayments } from '@app/modules/integrations/integrations/stripe/utils/stripe-readiness.util';
import { StripeApiService } from '@app/modules/integrations/integrations/stripe/services/stripe-api.service';
import { StripeCustomerService } from '@app/modules/integrations/integrations/stripe/services/stripe-customer.service';
import { WalletLedgerService } from '@app/modules/finance/payments/services/wallet-ledger.service';
import {
  CreateClientMembershipDto,
  ListClientMembershipsQueryDto,
  RedeemMembershipServiceDto,
  UpdateClientMembershipDto,
} from '../dto/membership.dto';
import {
  toClientMembershipDetail,
  toClientMembershipListItem,
} from '../mappers/membership.mapper';
import { ClientMembershipRepository } from '../repositories/client-membership.repository';
import { MembershipPlanRepository } from '../repositories/membership-plan.repository';
import type { MembershipPlanRow } from '../repositories/membership-plan.repository';

@Injectable()
export class ClientMembershipsService {
  private readonly logger = new Logger(ClientMembershipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientMembershipRepository: ClientMembershipRepository,
    private readonly planRepository: MembershipPlanRepository,
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly stripeCustomerService: StripeCustomerService,
    private readonly stripeApiService: StripeApiService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly walletLedger: WalletLedgerService,
    private readonly domainEventBus: DomainEventBusService,
  ) {}

  async listClientMemberships(
    businessId: string,
    query: ListClientMembershipsQueryDto,
  ) {
    const rows = await this.clientMembershipRepository.findMany(businessId, {
      contactId: query.contactId,
      search: query.search,
      status: query.status,
      planId: query.planId,
      showDifferentVersionsOnly: query.showDifferentVersionsOnly,
      showOlderUnpaid: query.showOlderUnpaid,
    });
    return rows.map(toClientMembershipListItem);
  }

  async getClientMembership(businessId: string, membershipId: string) {
    const row = await this.assertMembership(businessId, membershipId);
    return toClientMembershipDetail(row);
  }

  async assignMembership(
    businessId: string,
    dto: CreateClientMembershipDto,
    actor?: RequestUser,
  ) {
    await this.assertContact(businessId, dto.contactId);
    const plan = await this.assertPlan(businessId, dto.planId);

    const existing = await this.clientMembershipRepository.findActiveOnPlan(
      businessId,
      dto.contactId,
      dto.planId,
    );
    if (existing) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_ALREADY_ACTIVE,
        'Client already has an active membership on this plan.',
        HttpStatus.CONFLICT,
      );
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const isScheduled = startDate > new Date();

    const { stripeCustomerId } =
      await this.stripeCustomerService.getOrCreateForContact(
        businessId,
        dto.contactId,
      );

    let stripeSubscriptionId: string | null = null;
    if (plan.availableOnline && plan.stripePriceId) {
      try {
        stripeSubscriptionId = await this.createStripeSubscription(
          businessId,
          plan,
          stripeCustomerId,
          startDate,
        );
      } catch (error) {
        this.logger.warn(
          `Stripe subscription creation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const membership = await this.clientMembershipRepository.create({
      business: { connect: { id: businessId } },
      contact: { connect: { id: dto.contactId } },
      plan: { connect: { id: dto.planId } },
      status: isScheduled
        ? ClientMembershipStatus.SCHEDULED
        : ClientMembershipStatus.ACTIVE,
      price: plan.price,
      productDiscountPercent: plan.productDiscountPercent,
      serviceDiscountPercent: plan.serviceDiscountPercent,
      startDate,
      currentPeriodStart: isScheduled ? null : startDate,
      stripeCustomerId,
      stripeSubscriptionId,
      planVersion: 1,
    });

    if (!isScheduled) {
      await this.createUsageRecordsForPeriod(membership.id, plan, startDate);
      if (
        plan.planType === MembershipPlanType.ACCOUNT_CREDIT &&
        plan.creditAmount
      ) {
        await this.creditAccountBalance(
          businessId,
          dto.contactId,
          plan.creditAmount,
          membership.id,
        );
      }
      this.emitMembershipEvent(
        'membership.started',
        businessId,
        membership.id,
        {
          contactId: dto.contactId,
          planId: plan.id,
        },
      );
    }

    if (actor) {
      await this.auditService.log({
        actorUserId: actor.id,
        businessId,
        action: 'client_membership.created',
        entityType: 'ClientMembership',
        entityId: membership.id,
      });
    }

    return toClientMembershipDetail(membership);
  }

  async updateClientMembership(
    businessId: string,
    membershipId: string,
    dto: UpdateClientMembershipDto,
    actor: RequestUser,
  ) {
    const membership = await this.assertMembership(businessId, membershipId);

    switch (dto.action) {
      case 'pause':
        await this.pauseMembership(businessId, membership);
        break;
      case 'resume':
        await this.resumeMembership(businessId, membership);
        break;
      case 'cancel':
        await this.cancelMembership(
          businessId,
          membership,
          dto.cancelAtPeriodEnd ?? false,
        );
        break;
      case 'change_price_discounts':
        await this.clientMembershipRepository.update(membership.id, {
          price:
            dto.price != null
              ? new Prisma.Decimal(dto.price.toFixed(2))
              : undefined,
          productDiscountPercent:
            dto.productDiscountPercent != null
              ? new Prisma.Decimal(dto.productDiscountPercent.toFixed(2))
              : undefined,
          serviceDiscountPercent:
            dto.serviceDiscountPercent != null
              ? new Prisma.Decimal(dto.serviceDiscountPercent.toFixed(2))
              : undefined,
        });
        break;
      case 'add_extra_services':
        await this.addExtraServices(
          membership,
          dto.serviceGroupId!,
          dto.quantity!,
          dto.expiresAt,
        );
        break;
      case 'renew_early':
        await this.renewEarly(businessId, membership);
        break;
      default:
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Unsupported action',
          HttpStatus.BAD_REQUEST,
        );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: `client_membership.${dto.action}`,
      entityType: 'ClientMembership',
      entityId: membershipId,
    });

    return this.getClientMembership(businessId, membershipId);
  }

  async redeemServiceAtCheckout(
    businessId: string,
    membershipId: string,
    dto: RedeemMembershipServiceDto,
  ) {
    const membership = await this.assertMembership(businessId, membershipId);

    const record = await this.prisma.membershipUsageRecord.findFirst({
      where: {
        clientMembershipId: membershipId,
        serviceGroupId: dto.serviceGroupId,
        OR: [{ periodEnd: null }, { periodEnd: { gt: new Date() } }],
      },
      orderBy: { periodStart: 'desc' },
    });

    if (!record || record.usedSlots >= record.totalSlots) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_SLOTS_EXHAUSTED,
        'No remaining membership slots for this service group in the current period.',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.membershipUsageRecord.update({
      where: { id: record.id },
      data: {
        usedSlots: record.usedSlots + 1,
        saleLineItemId: dto.saleLineItemId,
      },
    });

    return {
      serviceDiscountPercent: membership.serviceDiscountPercent.toFixed(2),
      productDiscountPercent: membership.productDiscountPercent.toFixed(2),
    };
  }

  async applyMemberDiscountAtCheckout(
    businessId: string,
    contactId: string,
  ): Promise<{
    hasActiveMembership: boolean;
    productDiscountPercent: string;
    serviceDiscountPercent: string;
  } | null> {
    const memberships =
      await this.clientMembershipRepository.findActiveForContact(
        businessId,
        contactId,
      );
    if (memberships.length === 0) return null;

    const membership = memberships[0];
    return {
      hasActiveMembership: true,
      productDiscountPercent: membership.productDiscountPercent.toFixed(2),
      serviceDiscountPercent: membership.serviceDiscountPercent.toFixed(2),
    };
  }

  async findAvailableForService(
    businessId: string,
    contactId: string,
    serviceId: string,
  ) {
    const memberships =
      await this.clientMembershipRepository.findActiveForContact(
        businessId,
        contactId,
      );

    return memberships
      .map((membership) => {
        const matchingRecords = membership.usageRecords.filter((record) => {
          const hasService = record.serviceGroup.services.some(
            (s) => s.serviceId === serviceId,
          );
          return (
            hasService &&
            record.usedSlots < record.totalSlots &&
            (!record.expiresAt || record.expiresAt > new Date())
          );
        });

        if (matchingRecords.length === 0) return null;

        return {
          membershipId: membership.id,
          planName: membership.plan.name,
          usageRecords: matchingRecords.map((r) => ({
            id: r.id,
            serviceGroupId: r.serviceGroupId,
            remaining: r.totalSlots - r.usedSlots,
            totalSlots: r.totalSlots,
          })),
        };
      })
      .filter(Boolean);
  }

  async exportClientMemberships(
    businessId: string,
    query: ListClientMembershipsQueryDto,
  ): Promise<string> {
    const rows = await this.listClientMemberships(businessId, query);
    const header =
      'Client Name,Email,Plan,Start Date,Price,Status,Next Billing Date';
    const lines = rows.map((row) =>
      [
        this.escapeCsv(row.contact.name),
        this.escapeCsv(row.contact.email ?? ''),
        this.escapeCsv(`${row.plan.emoji ?? ''} ${row.plan.name}`.trim()),
        row.startDate.toISOString().slice(0, 10),
        row.price,
        row.status,
        row.nextBillingDate?.toISOString().slice(0, 10) ?? '',
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }

  async createUsageRecordsForPeriod(
    clientMembershipId: string,
    plan: MembershipPlanRow,
    periodStart: Date,
    periodEnd?: Date | null,
  ): Promise<void> {
    for (const group of plan.serviceGroups) {
      const expiresAt = plan.servicesExpireAfter
        ? new Date(
            periodStart.getTime() +
              plan.servicesExpireAfter * 24 * 60 * 60 * 1000,
          )
        : null;

      await this.prisma.membershipUsageRecord.create({
        data: {
          clientMembershipId,
          serviceGroupId: group.id,
          periodStart,
          periodEnd: periodEnd ?? null,
          totalSlots: group.quantity,
          usedSlots: 0,
          expiresAt,
        },
      });
    }
  }

  async creditAccountBalance(
    businessId: string,
    contactId: string,
    amount: Prisma.Decimal,
    membershipId: string,
  ): Promise<void> {
    await this.walletLedger.credit({
      businessId,
      contactId,
      amount,
      type: ContactWalletTransactionType.MEMBERSHIP_CREDIT,
      description: `Membership credit (${membershipId})`,
    });
  }

  async expireUsageRecords(): Promise<number> {
    const now = new Date();
    const expired = await this.prisma.$queryRaw<
      Array<{ id: string; clientMembershipId: string; businessId: string }>
    >`
      SELECT r.id, r."clientMembershipId", m."businessId"
      FROM membership_usage_records r
      JOIN client_memberships m ON m.id = r."clientMembershipId"
      WHERE r."expiresAt" < ${now}
        AND r."usedSlots" < r."totalSlots"
      LIMIT 500
    `;

    for (const record of expired) {
      this.emitMembershipEvent(
        'membership.services_expiring_soon',
        record.businessId,
        record.clientMembershipId,
        { usageRecordId: record.id },
      );
    }

    return expired.length;
  }

  private async pauseMembership(
    businessId: string,
    membership: { id: string; stripeSubscriptionId: string | null },
  ) {
    if (membership.stripeSubscriptionId) {
      const stripeAccountId = await this.getStripeAccountId(businessId);
      const stripe = this.stripeApiService.getClient();
      await stripe.subscriptions.update(
        membership.stripeSubscriptionId,
        { pause_collection: { behavior: 'mark_uncollectible' } },
        { stripeAccount: stripeAccountId },
      );
    }
    await this.clientMembershipRepository.update(membership.id, {
      status: ClientMembershipStatus.PAUSED,
      pausedAt: new Date(),
    });
    await this.logBillingEvent(
      membership.id,
      MembershipBillingEventType.SUBSCRIPTION_PAUSED,
    );
  }

  private async resumeMembership(
    businessId: string,
    membership: { id: string; stripeSubscriptionId: string | null },
  ) {
    if (membership.stripeSubscriptionId) {
      const stripeAccountId = await this.getStripeAccountId(businessId);
      const stripe = this.stripeApiService.getClient();
      await stripe.subscriptions.update(
        membership.stripeSubscriptionId,
        { pause_collection: '' },
        { stripeAccount: stripeAccountId },
      );
    }
    await this.clientMembershipRepository.update(membership.id, {
      status: ClientMembershipStatus.ACTIVE,
      pausedAt: null,
    });
    await this.logBillingEvent(
      membership.id,
      MembershipBillingEventType.SUBSCRIPTION_RESUMED,
    );
  }

  private async cancelMembership(
    businessId: string,
    membership: {
      id: string;
      stripeSubscriptionId: string | null;
      contactId: string;
    },
    cancelAtPeriodEnd: boolean,
  ) {
    if (membership.stripeSubscriptionId) {
      const stripeAccountId = await this.getStripeAccountId(businessId);
      const stripe = this.stripeApiService.getClient();
      if (cancelAtPeriodEnd) {
        await stripe.subscriptions.update(
          membership.stripeSubscriptionId,
          { cancel_at_period_end: true },
          { stripeAccount: stripeAccountId },
        );
        await this.clientMembershipRepository.update(membership.id, {
          cancelAtPeriodEnd: true,
        });
      } else {
        await stripe.subscriptions.cancel(
          membership.stripeSubscriptionId,
          {},
          { stripeAccount: stripeAccountId },
        );
        await this.clientMembershipRepository.update(membership.id, {
          status: ClientMembershipStatus.CANCELED,
          canceledAt: new Date(),
        });
        this.emitMembershipEvent(
          'membership.canceled',
          businessId,
          membership.id,
          { contactId: membership.contactId },
        );
      }
    } else {
      await this.clientMembershipRepository.update(membership.id, {
        status: ClientMembershipStatus.CANCELED,
        canceledAt: new Date(),
      });
    }
    await this.logBillingEvent(
      membership.id,
      MembershipBillingEventType.SUBSCRIPTION_CANCELED,
    );
  }

  private async renewEarly(
    businessId: string,
    membership: { id: string; stripeSubscriptionId: string | null },
  ) {
    if (!membership.stripeSubscriptionId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No Stripe subscription to renew',
        HttpStatus.BAD_REQUEST,
      );
    }
    const stripeAccountId = await this.getStripeAccountId(businessId);
    const stripe = this.stripeApiService.getClient();
    await stripe.subscriptions.update(
      membership.stripeSubscriptionId,
      { billing_cycle_anchor: 'now', proration_behavior: 'none' },
      { stripeAccount: stripeAccountId },
    );
  }

  private async addExtraServices(
    membership: { id: string },
    serviceGroupId: string,
    quantity: number,
    expiresAt?: string,
  ) {
    const record = await this.prisma.membershipUsageRecord.findFirst({
      where: {
        clientMembershipId: membership.id,
        serviceGroupId,
        OR: [{ periodEnd: null }, { periodEnd: { gt: new Date() } }],
      },
      orderBy: { periodStart: 'desc' },
    });

    if (record) {
      await this.prisma.membershipUsageRecord.update({
        where: { id: record.id },
        data: { totalSlots: record.totalSlots + quantity },
      });
    } else {
      await this.prisma.membershipUsageRecord.create({
        data: {
          clientMembershipId: membership.id,
          serviceGroupId,
          periodStart: new Date(),
          totalSlots: quantity,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });
    }
  }

  private async createStripeSubscription(
    businessId: string,
    plan: MembershipPlanRow,
    stripeCustomerId: string,
    startDate: Date,
  ): Promise<string> {
    const stripeAccountId = await this.getStripeAccountId(businessId);
    const stripe = this.stripeApiService.getClient();

    const params: Parameters<typeof stripe.subscriptions.create>[0] = {
      customer: stripeCustomerId,
      items: [{ price: plan.stripePriceId! }],
      metadata: {
        businessId,
        planId: plan.id,
        type: 'membership',
      },
      proration_behavior: 'none',
    };

    if (startDate > new Date()) {
      params.billing_cycle_anchor = Math.floor(startDate.getTime() / 1000);
      params.trial_end = Math.floor(startDate.getTime() / 1000);
    }

    const subscription = await stripe.subscriptions.create(params, {
      stripeAccount: stripeAccountId,
    });

    return subscription.id;
  }

  private async getStripeAccountId(businessId: string): Promise<string> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    const config = assertStripeReadyForPayments(integration);
    return config.stripeAccountId;
  }

  private async logBillingEvent(
    clientMembershipId: string,
    eventType: MembershipBillingEventType,
    extra?: {
      amount?: Prisma.Decimal;
      stripeInvoiceId?: string;
      stripePaymentIntentId?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await this.prisma.membershipBillingEvent.create({
      data: {
        clientMembershipId,
        eventType,
        amount: extra?.amount,
        stripeInvoiceId: extra?.stripeInvoiceId,
        stripePaymentIntentId: extra?.stripePaymentIntentId,
        metadata: extra?.metadata,
      },
    });
  }

  private emitMembershipEvent(
    triggerKey: string,
    businessId: string,
    membershipId: string,
    metadata: Record<string, string>,
  ) {
    this.domainEventBus.publish({
      triggerKey,
      businessId,
      subjectId: membershipId,
      subjectType: 'client_membership',
      metadata,
      auditAction: triggerKey,
      auditEntityType: 'ClientMembership',
      auditEntityId: membershipId,
      occurredAt: new Date().toISOString(),
    });
  }

  private escapeCsv(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private async assertMembership(businessId: string, id: string) {
    const row = await this.clientMembershipRepository.findById(businessId, id);
    if (!row) {
      throw new AppException(
        ErrorCode.CLIENT_MEMBERSHIP_NOT_FOUND,
        'Client membership not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async assertPlan(businessId: string, planId: string) {
    const plan = await this.planRepository.findById(businessId, planId);
    if (!plan || plan.isArchived) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_PLAN_NOT_FOUND,
        'Membership plan not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return plan;
  }

  private async assertContact(businessId: string, contactId: string) {
    const contact = await this.contactRepository.findById(
      businessId,
      contactId,
    );
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
