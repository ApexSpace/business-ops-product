import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import {
  assertStripeReadyForPayments,
  parseStripeIntegrationConfig,
} from '../utils/stripe-readiness.util';

export interface StripeConnectContext {
  ready: boolean;
  stripeAccountId: string | null;
  publishableKey: string | null;
  defaultCurrency: string | null;
  livemode: boolean;
}

@Injectable()
export class StripeConnectContextService {
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
  ) {}

  getPublishableKey(): string | null {
    return process.env.STRIPE_PUBLISHABLE_KEY?.trim() || null;
  }

  async getContextForBusiness(businessId: string): Promise<StripeConnectContext> {
    const publishableKey = this.getPublishableKey();
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );

    if (!integration) {
      return {
        ready: false,
        stripeAccountId: null,
        publishableKey,
        defaultCurrency: null,
        livemode: false,
      };
    }

    try {
      const config = assertStripeReadyForPayments(integration);
      return {
        ready: true,
        stripeAccountId: config.stripeAccountId,
        publishableKey,
        defaultCurrency: config.defaultCurrency,
        livemode: config.livemode,
      };
    } catch {
      const parsed = parseStripeIntegrationConfig(integration.config);
      return {
        ready: false,
        stripeAccountId: parsed?.stripeAccountId ?? null,
        publishableKey,
        defaultCurrency: parsed?.defaultCurrency ?? null,
        livemode: parsed?.livemode ?? false,
      };
    }
  }

  async requireStripeAccountId(businessId: string): Promise<string> {
    const ctx = await this.getContextForBusiness(businessId);
    if (!ctx.ready || !ctx.stripeAccountId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Connect Stripe before accepting card payments.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return ctx.stripeAccountId;
  }
}
