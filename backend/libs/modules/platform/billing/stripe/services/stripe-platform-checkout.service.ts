import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessMemberRole, MembershipStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  CheckoutSessionResponseDto,
  CreateBusinessCheckoutSessionDto,
} from '../dto/stripe-platform-billing.dto';
import {
  PLATFORM_SUBSCRIPTION_PURPOSE,
  type PlatformCheckoutMetadata,
} from '../types/stripe-platform-billing.types';
import { StripePlatformApiService } from './stripe-platform-api.service';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';

@Injectable()
export class StripePlatformCheckoutService {
  private readonly logger = new Logger(StripePlatformCheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripePlatformApiService,
    private readonly planMapping: StripePlatformPlanMappingService,
    private readonly metadataService: StripePlatformMetadataService,
  ) {}

  async createCheckoutSession(input: {
    businessId: string;
    planGroupId: string;
    planTierId: string;
    billingCycle: PlatformCheckoutMetadata['billingCycle'];
    customerEmail?: string | null;
  }): Promise<CheckoutSessionResponseDto> {
    const business = await this.prisma.business.findFirst({
      where: { id: input.businessId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const { priceId } = await this.planMapping.resolvePublishedTierPrice(
      input.planGroupId,
      input.planTierId,
      input.billingCycle,
    );

    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId: input.businessId },
    });
    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription?.metadata,
    );

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
    if (!frontendUrl) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'FRONTEND_URL is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const metadata: PlatformCheckoutMetadata = {
      purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
      businessId: input.businessId,
      planGroupId: input.planGroupId,
      planTierId: input.planTierId,
      billingCycle: input.billingCycle,
    };

    const stripe = this.stripeApi.getClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/business/settings/billing?checkout=success`,
      cancel_url: `${frontendUrl}/business/settings/billing?checkout=cancelled`,
      client_reference_id: input.businessId,
      ...(stripeMeta?.customerId ? { customer: stripeMeta.customerId } : {}),
      ...(input.customerEmail && !stripeMeta?.customerId
        ? { customer_email: input.customerEmail }
        : {}),
      subscription_data: {
        metadata: {
          purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
          businessId: input.businessId,
          planGroupId: input.planGroupId,
          planTierId: input.planTierId,
          billingCycle: input.billingCycle,
        },
      },
      metadata: metadata as unknown as Record<string, string>,
    });

    if (!session.url) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to create Stripe checkout session',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (subscription) {
      await this.prisma.businessSubscription.update({
        where: { businessId: input.businessId },
        data: {
          metadata: this.metadataService.mergeSubscriptionStripeMetadata(
            subscription.metadata,
            {
              pendingCheckoutSessionId: session.id,
              pendingPlanGroupId: input.planGroupId,
              pendingPlanTierId: input.planTierId,
              pendingBillingCycle: input.billingCycle,
              checkoutStartedAt: new Date().toISOString(),
            },
          ),
        },
      });
    }

    this.logger.log(
      `Created platform checkout ${session.id} for business ${input.businessId}`,
    );

    return { sessionId: session.id, url: session.url };
  }

  async resolveActiveOwnerEmail(businessId: string): Promise<string> {
    const ownerMembership = await this.prisma.businessMembership.findFirst({
      where: {
        businessId,
        role: BusinessMemberRole.OWNER,
        deletedAt: null,
        status: MembershipStatus.ACTIVE,
      },
      select: {
        user: { select: { email: true } },
      },
    });

    const email = ownerMembership?.user?.email?.trim();
    if (!email) {
      throw new AppException(
        ErrorCode.BUSINESS_OWNER_REQUIRED,
        'A business owner must be set before starting checkout.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return email;
  }

  async createCheckoutSessionForCurrentBusiness(
    businessId: string,
    dto: CreateBusinessCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    const planGroupId = dto.planGroupId ?? subscription?.planGroupId;
    if (!planGroupId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No plan group is assigned to this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    const customerEmail = await this.resolveActiveOwnerEmail(businessId);

    return this.createCheckoutSession({
      businessId,
      planGroupId,
      planTierId: dto.planTierId,
      billingCycle: dto.billingCycle,
      customerEmail,
    });
  }
}
