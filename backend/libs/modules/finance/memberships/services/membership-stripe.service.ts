import { Injectable } from '@nestjs/common';
import {
  MembershipBillingIntervalUnit,
  MembershipPlanType,
  Prisma,
} from '@prisma/client';
import { StripeConnectContextService } from '@app/modules/integrations/integrations/stripe/services/stripe-connect-context.service';
import type { MembershipPlanRow } from '../repositories/membership-plan.repository';

@Injectable()
export class MembershipStripeService {
  constructor(
    private readonly stripeConnectContext: StripeConnectContextService,
  ) {}

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
    const chargeCtx =
      await this.stripeConnectContext.resolveTenantStripeChargeContext(
        businessId,
      );

    const product = await chargeCtx.stripe.products.create(
      {
        name: plan.name,
        metadata: {
          businessId,
          planId: plan.id,
          type: 'membership',
        },
      },
      { stripeAccount: chargeCtx.stripeAccountId },
    );

    const recurring = this.intervalToStripe(
      plan.billingIntervalUnit,
      plan.billingIntervalCount,
    );

    const price = await chargeCtx.stripe.prices.create(
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
      { stripeAccount: chargeCtx.stripeAccountId },
    );

    return { stripeProductId: product.id, stripePriceId: price.id };
  }

  async deactivateProduct(
    businessId: string,
    stripeProductId: string,
  ): Promise<void> {
    const chargeCtx =
      await this.stripeConnectContext.resolveTenantStripeChargeContext(
        businessId,
      );
    await chargeCtx.stripe.products.update(
      stripeProductId,
      { active: false },
      { stripeAccount: chargeCtx.stripeAccountId },
    );
  }

  async schedulePriceChange(
    businessId: string,
    plan: MembershipPlanRow,
    newPrice: Prisma.Decimal,
  ): Promise<string> {
    const chargeCtx =
      await this.stripeConnectContext.resolveTenantStripeChargeContext(
        businessId,
      );

    const recurring = this.intervalToStripe(
      plan.billingIntervalUnit,
      plan.billingIntervalCount,
    );

    const price = await chargeCtx.stripe.prices.create(
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
      { stripeAccount: chargeCtx.stripeAccountId },
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
