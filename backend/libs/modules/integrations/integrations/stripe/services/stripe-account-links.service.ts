import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationStatus } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { RootConfig } from '@app/core/config/configuration';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import {
  PrimaryPaymentAccountResponseDto,
  StripeConnectionStatus,
} from '../dto/stripe-account-links.dto';
import {
  assertStripeReadyForPayments,
  parseStripeIntegrationConfig,
} from '../utils/stripe-readiness.util';
import { StripeApiService } from './stripe-api.service';
import { StripeConnectContextService } from './stripe-connect-context.service';

const PAYMENT_ACCOUNT_SETTINGS_PATH = '/business/settings/payment-account';

@Injectable()
export class StripeAccountLinksService {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly stripeApiService: StripeApiService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly stripeConnectContext: StripeConnectContextService,
    private readonly auditService: AuditService,
  ) {}

  async getPrimaryAccountSummary(
    businessId: string,
  ): Promise<PrimaryPaymentAccountResponseDto> {
    const publishableKey = this.stripeConnectContext.getPublishableKey();
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      return {
        connectionStatus: 'NOT_CONNECTED',
        ready: false,
        stripeAccountId: null,
        accountName: null,
        readinessLabel: null,
        modeLabel: null,
        defaultCurrency: null,
        country: null,
        livemode: false,
        publishableKey,
      };
    }

    const parsed = parseStripeIntegrationConfig(integration.config);
    const connectionStatus = this.resolveConnectionStatus(integration);
    const modeLabel = parsed?.livemode ? 'Live mode' : 'Test mode';

    return {
      connectionStatus,
      ready: connectionStatus === 'READY',
      stripeAccountId: parsed?.stripeAccountId ?? null,
      accountName: integration.connectedAccountName ?? null,
      readinessLabel: parsed?.readinessLabel ?? null,
      modeLabel,
      defaultCurrency: parsed?.defaultCurrency ?? null,
      country: parsed?.country ?? null,
      livemode: parsed?.livemode ?? false,
      publishableKey,
    };
  }

  async createOnboardingLink(
    businessId: string,
    actor: RequestUser,
  ): Promise<{ url: string }> {
    this.assertStripeConnectConfigured();
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Connect Stripe before managing your payment account.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const connectionStatus = this.resolveConnectionStatus(integration);
    if (connectionStatus === 'READY') {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe account is already fully set up. Use the dashboard link instead.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stripeAccountId = await this.requireStripeAccountId(businessId);
    const returnUrl = this.buildSettingsReturnUrl();
    const url = await this.stripeApiService.createAccountOnboardingLink(
      stripeAccountId,
      returnUrl,
      returnUrl,
    );

    await this.auditLinkCreated(businessId, actor.id, 'onboarding', stripeAccountId);
    return { url };
  }

  async createDashboardLink(
    businessId: string,
    actor: RequestUser,
  ): Promise<{ url: string }> {
    this.assertStripeConnectConfigured();
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    assertStripeReadyForPayments(integration);

    const config = parseStripeIntegrationConfig(integration!.config);
    const stripeAccountId = config!.stripeAccountId;
    const url = await this.stripeApiService.createAccountLoginLink(stripeAccountId);

    await this.auditLinkCreated(businessId, actor.id, 'dashboard', stripeAccountId);
    return { url };
  }

  private resolveConnectionStatus(integration: {
    status: IntegrationStatus;
    config: unknown;
  }): StripeConnectionStatus {
    if (integration.status !== IntegrationStatus.CONNECTED) {
      return 'NOT_CONNECTED';
    }
    try {
      assertStripeReadyForPayments(integration);
      return 'READY';
    } catch {
      return parseStripeIntegrationConfig(integration.config)
        ? 'CONNECTED_INCOMPLETE'
        : 'NOT_CONNECTED';
    }
  }

  private async requireStripeAccountId(businessId: string): Promise<string> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Connect Stripe before managing your payment account.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const config = parseStripeIntegrationConfig(integration.config);
    if (!config?.stripeAccountId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe account is not linked. Sync or reconnect Stripe.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return config.stripeAccountId;
  }

  private buildSettingsReturnUrl(): string {
    const frontendBase = this.configService
      .get('app.frontendUrl', { infer: true })
      .replace(/\/$/, '');
    return `${frontendBase}${PAYMENT_ACCOUNT_SETTINGS_PATH}`;
  }

  private assertStripeConnectConfigured(): void {
    if (!this.stripeApiService.isConfigured()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe Connect is not configured. Please set STRIPE_SECRET_KEY, STRIPE_CLIENT_ID, and STRIPE_REDIRECT_URI.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async auditLinkCreated(
    businessId: string,
    actorUserId: string,
    type: 'onboarding' | 'dashboard',
    stripeAccountId: string,
  ): Promise<void> {
    await this.auditService.log({
      actorUserId,
      businessId,
      action: 'stripe.account_link.created',
      entityType: 'BusinessIntegration',
      entityId: businessId,
      metadata: { type, stripeAccountId },
    });
  }
}
