import { HttpStatus, Injectable } from '@nestjs/common';
import type Stripe from 'stripe';
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
  isStripeModeConfigured,
  readPaymentsModeFromSettings,
  type StripePaymentsMode,
} from '../utils/stripe-mode.util';
import { StripeApiService } from './stripe-api.service';

type StripeClient = InstanceType<typeof Stripe>;

export interface StripeConnectContext {
  ready: boolean;
  stripeAccountId: string | null;
  publishableKey: string | null;
  defaultCurrency: string | null;
  livemode: boolean;
  paymentsMode: StripePaymentsMode;
}

/** Mode-aware Stripe client + Connect account for tenant charges. */
export interface TenantStripeChargeContext {
  mode: StripePaymentsMode;
  livemode: boolean;
  stripe: StripeClient;
  publishableKey: string;
  stripeAccountId: string;
  defaultCurrency: string | null;
}

@Injectable()
export class StripeConnectContextService {
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripeApiService,
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

  /**
   * Resolve Connect account + Stripe SDK client for the business payments mode.
   * Use for all tenant charges except form collect_payment (field-level mode).
   */
  async resolveTenantStripeChargeContext(
    businessId: string,
  ): Promise<TenantStripeChargeContext> {
    const ctx = await this.getContextForBusiness(businessId);
    if (!ctx.ready || !ctx.stripeAccountId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Connect Stripe before accepting card payments.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!isStripeModeConfigured(ctx.paymentsMode)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        ctx.paymentsMode === 'test'
          ? 'Stripe test mode is not configured'
          : 'Stripe is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!ctx.publishableKey) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe publishable key is not configured for the selected mode',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      mode: ctx.paymentsMode,
      livemode: ctx.livemode,
      stripe: this.stripeApi.getClientForMode(ctx.paymentsMode),
      publishableKey: ctx.publishableKey,
      stripeAccountId: ctx.stripeAccountId,
      defaultCurrency: ctx.defaultCurrency,
    };
  }
}
