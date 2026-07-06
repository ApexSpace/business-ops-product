import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientMembershipStatus,
  MembershipBillingEventType,
  MembershipPlanType,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RootConfig } from '@app/core/config/configuration';
import { PrismaService } from '@app/core/database/prisma.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import {
  assertStripeReadyForPayments,
  parseStripeIntegrationConfig,
} from '@app/modules/integrations/integrations/stripe/utils/stripe-readiness.util';
import { StripeApiService } from '@app/modules/integrations/integrations/stripe/services/stripe-api.service';
import { StripeConnectContextService } from '@app/modules/integrations/integrations/stripe/services/stripe-connect-context.service';
import { StripeCustomerService } from '@app/modules/integrations/integrations/stripe/services/stripe-customer.service';
import { STRIPE_PAYMENT_PURPOSE } from '@app/modules/finance/payments/constants/stripe-payment-purpose.constants';
import { InitiateMembershipCheckoutDto } from '../dto/membership.dto';
import { toMembershipPlan } from '../mappers/membership.mapper';
import { MembershipPlanRepository } from '../repositories/membership-plan.repository';
import { MembershipSettingsRepository } from '../repositories/membership-settings.repository';
import { ClientMembershipsService } from './client-memberships.service';
import { MembershipSettingsService } from './membership-settings.service';

@Injectable()
export class MembershipOnlineCheckoutService {
  private readonly logger = new Logger(MembershipOnlineCheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsRepository: MembershipSettingsRepository,
    private readonly settingsService: MembershipSettingsService,
    private readonly planRepository: MembershipPlanRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly stripeApiService: StripeApiService,
    private readonly stripeConnectContext: StripeConnectContextService,
    private readonly stripeCustomerService: StripeCustomerService,
    private readonly contactRepository: ContactRepository,
    private readonly clientMembershipsService: ClientMembershipsService,
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  async getPublicCatalog(slug: string) {
    const { business, settings } = await this.resolveBusinessBySlug(slug);

    if (!settings.onlineSalesEnabled) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_ONLINE_SALES_DISABLED,
        'Online membership sales are not enabled',
        HttpStatus.NOT_FOUND,
      );
    }

    const plans = await this.planRepository.findOnlinePlans(business.id);
    const stripeReady = await this.settingsService.isStripeReady(business.id);

    return {
      business: {
        id: business.id,
        name: business.displayName ?? business.name,
      },
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        price: p.price.toFixed(2),
        billingIntervalUnit: p.billingIntervalUnit,
        shortDescription: p.shortDescription,
      })),
      stripeReady,
    };
  }

  async getPlanForCheckout(tenantSlug: string, planId: string) {
    const { business, settings } = await this.resolveBusinessBySlug(tenantSlug);

    if (!settings.onlineSalesEnabled) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_ONLINE_SALES_DISABLED,
        'Online membership sales are not enabled',
        HttpStatus.NOT_FOUND,
      );
    }

    const plan = await this.planRepository.findPublicPlan(business.id, planId);
    if (!plan) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_PLAN_NOT_FOUND,
        'Membership plan not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const stripeReady = await this.settingsService.isStripeReady(business.id);

    return {
      business: {
        id: business.id,
        name: business.displayName ?? business.name,
      },
      plan: toMembershipPlan(plan),
      stripeReady,
    };
  }

  async createCheckoutSession(
    tenantSlug: string,
    planId: string,
    dto: InitiateMembershipCheckoutDto,
  ) {
    const { business, settings } = await this.resolveBusinessBySlug(tenantSlug);

    if (!settings.onlineSalesEnabled) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_ONLINE_SALES_DISABLED,
        'Online membership sales are not enabled',
        HttpStatus.NOT_FOUND,
      );
    }

    const plan = await this.planRepository.findPublicPlan(business.id, planId);
    if (!plan || !plan.stripePriceId) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_PLAN_NOT_FOUND,
        'Membership plan not available for online purchase',
        HttpStatus.NOT_FOUND,
      );
    }

    if (plan.requireAgreement && !dto.agreementAccepted) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Membership agreement must be accepted',
        HttpStatus.BAD_REQUEST,
      );
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        business.id,
        'stripe',
      );
    const stripeConfig = assertStripeReadyForPayments(integration);

    const contact = await this.findOrCreateContact(business.id, dto);
    const { stripeCustomerId } =
      await this.stripeCustomerService.getOrCreateForContact(
        business.id,
        contact.id,
      );

    const frontendUrl = this.configService.get('app', {
      infer: true,
    }).frontendUrl;
    const stripe = this.stripeApiService.getClient();

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: `${frontendUrl}/memberships/${tenantSlug}/${planId}?success=1`,
        cancel_url: `${frontendUrl}/memberships/${tenantSlug}/${planId}?canceled=1`,
        metadata: {
          businessId: business.id,
          planId: plan.id,
          contactId: contact.id,
          type: 'membership',
          purpose: STRIPE_PAYMENT_PURPOSE.MEMBERSHIP,
          purchaserEmail: dto.email,
          purchaserName: `${dto.firstName} ${dto.lastName}`.trim(),
        },
        subscription_data: {
          metadata: {
            businessId: business.id,
            planId: plan.id,
            contactId: contact.id,
            type: 'membership',
            purpose: STRIPE_PAYMENT_PURPOSE.MEMBERSHIP,
          },
        },
      },
      { stripeAccount: stripeConfig.stripeAccountId },
    );

    if (!session.url) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Unable to create checkout session',
        HttpStatus.BAD_REQUEST,
      );
    }

    return { url: session.url };
  }

  async handleCheckoutSessionCompleted(
    metadata: Record<string, string>,
    subscriptionId?: string,
  ): Promise<boolean> {
    if (
      metadata.type !== 'membership' &&
      metadata.purpose !== STRIPE_PAYMENT_PURPOSE.MEMBERSHIP
    ) {
      return false;
    }

    const businessId = metadata.businessId;
    const planId = metadata.planId;
    const contactId = metadata.contactId;

    if (!businessId || !planId || !contactId) return false;

    if (subscriptionId) {
      const existing = await this.prisma.clientMembership.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      });
      if (existing) return true;
    }

    const plan = await this.planRepository.findById(businessId, planId);
    if (!plan) return false;

    const now = new Date();
    const membership = await this.prisma.clientMembership.create({
      data: {
        businessId,
        contactId,
        planId,
        status: ClientMembershipStatus.ACTIVE,
        price: plan.price,
        productDiscountPercent: plan.productDiscountPercent,
        serviceDiscountPercent: plan.serviceDiscountPercent,
        startDate: now,
        currentPeriodStart: now,
        stripeSubscriptionId: subscriptionId ?? null,
        agreementAcceptedAt: plan.requireAgreement ? now : null,
        planVersion: 1,
      },
    });

    await this.clientMembershipsService.createUsageRecordsForPeriod(
      membership.id,
      plan,
      now,
    );

    if (
      plan.planType === MembershipPlanType.ACCOUNT_CREDIT &&
      plan.creditAmount
    ) {
      await this.clientMembershipsService.creditAccountBalance(
        businessId,
        contactId,
        plan.creditAmount,
        membership.id,
      );
    }

    await this.prisma.membershipBillingEvent.create({
      data: {
        clientMembershipId: membership.id,
        eventType: MembershipBillingEventType.SUBSCRIPTION_CREATED,
      },
    });

    return true;
  }

  private async resolveBusinessBySlug(slug: string) {
    const settings = await this.settingsRepository.findBySlug(slug);
    if (!settings?.business || settings.business.deletedAt) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return { business: settings.business, settings };
  }

  private async findOrCreateContact(
    businessId: string,
    dto: InitiateMembershipCheckoutDto,
  ) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.contactRepository.findByEmail(
      businessId,
      email,
    );
    if (existing) return existing;

    return this.contactRepository.createPublic(businessId, {
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      phoneNumber: dto.phone?.trim() || undefined,
    });
  }
}
