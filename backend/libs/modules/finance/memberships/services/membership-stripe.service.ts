import { HttpStatus, Injectable } from '@nestjs/common';
import {
  MembershipBillingIntervalUnit,
  MembershipPlanType,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import {
  assertStripeReadyForPayments,
} from '@app/modules/integrations/integrations/stripe/utils/stripe-readiness.util';
import { StripeApiService } from '@app/modules/integrations/integrations/stripe/services/stripe-api.service';
import type { MembershipPlanRow } from '../repositories/membership-plan.repository';

@Injectable()
export class MembershipStripeService {
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly stripeApiService: StripeApiService,
  ) {}

  private async getStripeAccountId(businessId: string): Promise<string> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    const config = assertStripeReadyForPayments(integration);
    return config.stripeAccountId;
  }

  private intervalToStripe(
    unit: MembershipBillingIntervalUnit,
    count: number,
  ): { interval: 'week' | 'month' | 'year'; interval_count: number } {
    const map: Record<
      MembershipBillingIntervalUnit,
      'week' | 'month' | 'year'
    > = {
      WEEK: 'week',
      MONTH: 'month',
      YEAR: 'year',
    };
    return { interval: map[unit], interval_count: count };
  }

  async createProductAndPrice(
    businessId: string,
    plan: {
      id: string;
      name: string;
      price: Prisma.Decimal;
      billingIntervalCount: number;
      billingIntervalUnit: MembershipBillingIntervalUnit;
      planType: MembershipPlanType;
    },
  ): Promise<{ stripeProductId: string; stripePriceId: string }> {
    const stripeAccountId = await this.getStripeAccountId(businessId);
    const stripe = this.stripeApiService.getClient();

    const product = await stripe.products.create(
      {
        name: plan.name,
        metadata: {
          businessId,
          planId: plan.id,
          type: 'membership',
        },
      },
      { stripeAccount: stripeAccountId },
    );

    const recurring = this.intervalToStripe(
      plan.billingIntervalUnit,
      plan.billingIntervalCount,
    );

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: Math.round(Number(plan.price.toString()) * 100),
        currency: 'usd',
        recurring,
        metadata: {
          businessId,
          planId: plan.id,
          type: 'membership',
        },
      },
      { stripeAccount: stripeAccountId },
    );

    return { stripeProductId: product.id, stripePriceId: price.id };
  }

  async deactivateProduct(
    businessId: string,
    stripeProductId: string,
  ): Promise<void> {
    const stripeAccountId = await this.getStripeAccountId(businessId);
    const stripe = this.stripeApiService.getClient();
    await stripe.products.update(
      stripeProductId,
      { active: false },
      { stripeAccount: stripeAccountId },
    );
  }

  async schedulePriceChange(
    businessId: string,
    plan: MembershipPlanRow,
    newPrice: Prisma.Decimal,
  ): Promise<string> {
    const stripeAccountId = await this.getStripeAccountId(businessId);
    const stripe = this.stripeApiService.getClient();

    const recurring = this.intervalToStripe(
      plan.billingIntervalUnit,
      plan.billingIntervalCount,
    );

    const price = await stripe.prices.create(
      {
        product: plan.stripeProductId!,
        unit_amount: Math.round(Number(newPrice.toString()) * 100),
        currency: 'usd',
        recurring,
        metadata: {
          businessId,
          planId: plan.id,
          type: 'membership',
        },
      },
      { stripeAccount: stripeAccountId },
    );

    return price.id;
  }

  async ensureStripeProduct(
    businessId: string,
    plan: MembershipPlanRow,
  ): Promise<{ stripeProductId: string; stripePriceId: string }> {
    if (plan.stripeProductId && plan.stripePriceId) {
      return {
        stripeProductId: plan.stripeProductId,
        stripePriceId: plan.stripePriceId,
      };
    }
    return this.createProductAndPrice(businessId, plan);
  }
}
