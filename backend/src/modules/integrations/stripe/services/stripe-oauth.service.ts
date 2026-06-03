import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationConnectionType,
  IntegrationStatus,
  Prisma,
} from '@prisma/client';
import type { Response } from 'express';
import { RequestUser } from '../../../../common/decorators/current-user.decorator';
import { AppException } from '../../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../../common/exceptions/error-code.enum';
import { encryptIntegrationCredentials } from '../../../../common/utils/integration-encryption.util';
import { RootConfig } from '../../../../config/configuration';
import { AuditService } from '../../../audit/services/audit.service';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { IntegrationProviderRepository } from '../../repositories/integration-provider.repository';
import {
  isStripeOAuthProviderKey,
  STRIPE_OAUTH_AUTHORIZE_URL,
  STRIPE_OAUTH_PROVIDER_KEY,
  STRIPE_OAUTH_SCOPE,
  STRIPE_OAUTH_TOKEN_URL,
} from '../constants/stripe-oauth.constants';
import {
  createStripeOAuthState,
  verifyStripeOAuthState,
} from '../utils/stripe-oauth-state.util';
import { StripeAccountService } from './stripe-account.service';
import { StripeApiService } from './stripe-api.service';

type StripeOAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  stripe_user_id: string;
  scope: string;
  livemode: boolean;
};

@Injectable()
export class StripeOAuthService {
  private readonly logger = new Logger(StripeOAuthService.name);

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly stripeApiService: StripeApiService,
    private readonly stripeAccountService: StripeAccountService,
    private readonly providerRepository: IntegrationProviderRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly auditService: AuditService,
  ) {}

  async redirectToStripe(user: RequestUser, res: Response): Promise<void> {
    this.assertStripeConnectConfigured();
    await this.assertOAuthProvider(STRIPE_OAUTH_PROVIDER_KEY);

    const state = createStripeOAuthState(
      {
        businessId: user.businessId!,
        userId: user.id,
        providerKey: STRIPE_OAUTH_PROVIDER_KEY,
      },
      this.getStateSecret(),
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.stripeApiService.getClientId(),
      scope: STRIPE_OAUTH_SCOPE,
      state,
      redirect_uri: this.stripeApiService.getRedirectUri(),
    });

    res.redirect(`${STRIPE_OAUTH_AUTHORIZE_URL}?${params.toString()}`);
  }

  async handleCallback(
    code: string | undefined,
    state: string | undefined,
    error: string | undefined,
    res: Response,
  ): Promise<void> {
    if (error || !code || !state) {
      res.redirect(this.buildOAuthCallbackUrl({ error: 'stripe_oauth_failed' }));
      return;
    }

    let payload;
    try {
      payload = verifyStripeOAuthState(state, this.getStateSecret());
    } catch {
      res.redirect(this.buildOAuthCallbackUrl({ error: 'stripe_oauth_failed' }));
      return;
    }

    if (!isStripeOAuthProviderKey(payload.providerKey)) {
      res.redirect(this.buildOAuthCallbackUrl({ error: 'stripe_oauth_failed' }));
      return;
    }

    try {
      await this.assertOAuthProvider(payload.providerKey);
      const tokens = await this.exchangeCodeForTokens(code);
      const integration = await this.saveBusinessIntegration(payload, tokens);
      const account = await this.stripeApiService.retrieveConnectedAccount(
        tokens.stripe_user_id,
      );

      await this.stripeAccountService.persistAccountSnapshot(
        integration.id,
        payload.businessId,
        account,
        tokens.livemode,
        payload.userId,
      );

      await this.auditService.log({
        actorUserId: payload.userId,
        businessId: payload.businessId,
        action: 'stripe.connected',
        entityType: 'BusinessIntegration',
        entityId: integration.id,
        metadata: {
          providerKey: payload.providerKey,
          stripeAccountId: tokens.stripe_user_id,
          livemode: tokens.livemode,
        },
      });

      res.redirect(
        this.buildOAuthCallbackUrl({
          connected: payload.providerKey,
          providerKey: payload.providerKey,
        }),
      );
    } catch (err) {
      this.stripeApiService.logStripeError('OAuth callback', err);
      res.redirect(this.buildOAuthCallbackUrl({ error: 'stripe_oauth_failed' }));
    }
  }

  private async exchangeCodeForTokens(
    code: string,
  ): Promise<StripeOAuthTokenResponse> {
    const response = await fetch(STRIPE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_secret: process.env.STRIPE_SECRET_KEY!.trim(),
      }),
    });

    if (!response.ok) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to exchange Stripe authorization code',
        HttpStatus.BAD_REQUEST,
      );
    }

    return (await response.json()) as StripeOAuthTokenResponse;
  }

  private async saveBusinessIntegration(
    payload: {
      businessId: string;
      userId: string;
      providerKey: string;
    },
    tokens: StripeOAuthTokenResponse,
  ) {
    const credentialsPayload = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      stripeUserId: tokens.stripe_user_id,
      livemode: tokens.livemode,
      scope: tokens.scope,
      tokenType: tokens.token_type,
    };

    const encryptedCredentials = encryptIntegrationCredentials(
      this.getEncryptionKey(),
      credentialsPayload,
    );

    const now = new Date();
    return this.businessIntegrationRepository.upsert(
      payload.businessId,
      payload.providerKey,
      {
        status: IntegrationStatus.CONNECTED,
        config: {
          provider: 'stripe',
          stripeAccountId: tokens.stripe_user_id,
          livemode: tokens.livemode,
          scope: tokens.scope,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          defaultCurrency: null,
          country: null,
          readinessLabel: 'Setup incomplete',
          webhookStatus: 'pending',
        } as Prisma.InputJsonValue,
        credentials: { encrypted: encryptedCredentials } as Prisma.InputJsonValue,
        connectedAt: now,
        errorMessage: null,
      },
    );
  }

  private async assertOAuthProvider(providerKey: string): Promise<void> {
    const provider = await this.providerRepository.findByKey(providerKey);
    if (
      !provider ||
      !provider.isActive ||
      !provider.isBusinessLevel ||
      provider.connectionType !== IntegrationConnectionType.OAUTH
    ) {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_AVAILABLE,
        'Integration provider is not available for OAuth',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!isStripeOAuthProviderKey(providerKey)) {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_AVAILABLE,
        'Provider is not a supported Stripe OAuth integration',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertStripeConnectConfigured(): void {
    if (!this.stripeApiService.isConfigured()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe Connect is not configured. Please set STRIPE_SECRET_KEY, STRIPE_CLIENT_ID, and STRIPE_REDIRECT_URI.',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.getEncryptionKey();
  }

  private getFrontendBaseUrl(): string {
    return this.configService.get('app.frontendUrl', { infer: true });
  }

  private buildOAuthCallbackUrl(params: {
    connected?: string;
    error?: string;
    providerKey?: string;
  }): string {
    const frontendBase = this.getFrontendBaseUrl();
    const url = new URL(`${frontendBase}/oauth/callback`);
    if (params.connected) {
      url.searchParams.set('connected', params.connected);
    }
    if (params.error) {
      url.searchParams.set('error', params.error);
    }
    if (params.providerKey) {
      url.searchParams.set('providerKey', params.providerKey);
    }
    return url.toString();
  }

  private getStateSecret(): string {
    return (
      process.env.INTEGRATION_ENCRYPTION_KEY ??
      this.configService.get('jwt.accessSecret', { infer: true })
    );
  }

  private getEncryptionKey(): string {
    const key = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!key) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Integration encryption key is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }
    return key;
  }
}
