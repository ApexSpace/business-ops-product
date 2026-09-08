import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import {
  assertStripeReadyForPayments,
  parseStripeIntegrationConfig,
} from '../utils/stripe-readiness.util';
import {
  getStripePublishableForMode,
  readPaymentsModeFromSettings,
  type StripePaymentsMode,
} from '../utils/stripe-mode.util';

export interface StripeConnectContext {
  ready: boolean;
  stripeAccountId: string | null;
  publishableKey: string | null;
  defaultCurrency: string | null;
  livemode: boolean;
  paymentsMode: StripePaymentsMode;
}

@Injectable()
export class StripeConnectContextService {
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly prisma: PrismaService,
  ) {}

  getPublishableKey(): string | null {
    return getStripePublishableForMode('live');
  }

  getPublishableKeyForMode(mode: StripePaymentsMode): string | null {
    return getStripePublishableForMode(mode);
  }

  async getPaymentsModeForBusiness(
    businessId: string,
  ): Promise<StripePaymentsMode> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { settings: true },
    });
    return readPaymentsModeFromSettings(business?.settings);
  }

  async getContextForBusiness(
    businessId: string,
  ): Promise<StripeConnectContext> {
    const paymentsMode = await this.getPaymentsModeForBusiness(businessId);
    const publishableKey = this.getPublishableKeyForMode(paymentsMode);
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
        livemode: paymentsMode === 'live',
        paymentsMode,
      };
    }

    try {
      const config = assertStripeReadyForPayments(integration);
      return {
        ready: true,
        stripeAccountId: config.stripeAccountId,
        publishableKey,
        defaultCurrency: config.defaultCurrency,
        livemode: paymentsMode === 'live',
        paymentsMode,
      };
    } catch {
      const parsed = parseStripeIntegrationConfig(integration.config);
      return {
        ready: false,
        stripeAccountId: parsed?.stripeAccountId ?? null,
        publishableKey,
        defaultCurrency: parsed?.defaultCurrency ?? null,
        livemode: paymentsMode === 'live',
        paymentsMode,
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
