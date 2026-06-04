import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationConnectionType, IntegrationStatus, Prisma } from '@prisma/client';
import { Response } from 'express';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { encryptIntegrationCredentials } from '@app/common/utils/integration-encryption.util';
import { RootConfig } from '@app/core/config/configuration';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  GOOGLE_OAUTH_AUTHORIZE_URL,
  GOOGLE_OAUTH_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  getGoogleScopesForProvider,
  isGoogleOAuthProviderKey,
} from './constants/google-oauth.constants';
import { BusinessIntegrationRepository } from './repositories/business-integration.repository';
import { IntegrationProviderRepository } from './repositories/integration-provider.repository';
import {
  createGoogleOAuthState,
  verifyGoogleOAuthState,
} from './utils/google-oauth-state.util';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class GoogleOAuthService {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly providerRepository: IntegrationProviderRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly auditService: AuditService,
  ) {}

  async redirectToGoogle(
    user: RequestUser,
    providerKey: string,
    res: Response,
  ): Promise<void> {
    if (!isGoogleOAuthProviderKey(providerKey)) {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: 'google_oauth_invalid_provider',
          providerKey,
        }),
      );
      return;
    }

    this.assertGoogleOAuthConfigured();
    await this.assertOAuthProvider(providerKey);

    const state = createGoogleOAuthState(
      {
        businessId: user.businessId!,
        userId: user.id,
        providerKey,
      },
      this.getStateSecret(),
    );

    const authorizationUrl = this.buildAuthorizationUrl(providerKey, state);
    res.redirect(authorizationUrl);
  }

  async handleCallback(
    code: string | undefined,
    state: string | undefined,
    error: string | undefined,
    res: Response,
  ): Promise<void> {
    if (error) {
      res.redirect(this.buildOAuthCallbackUrl({ error }));
      return;
    }

    if (!code || !state) {
      res.redirect(
        this.buildOAuthCallbackUrl({ error: 'missing_oauth_params' }),
      );
      return;
    }

    let payload;
    try {
      payload = verifyGoogleOAuthState(state, this.getStateSecret());
    } catch {
      res.redirect(
        this.buildOAuthCallbackUrl({ error: 'invalid_oauth_state' }),
      );
      return;
    }

    if (!isGoogleOAuthProviderKey(payload.providerKey)) {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: 'invalid_provider',
          providerKey: payload.providerKey,
        }),
      );
      return;
    }

    try {
      await this.assertOAuthProvider(payload.providerKey);
      const tokens = await this.exchangeCodeForTokens(code);
      const profile = await this.fetchGoogleUserInfo(tokens.access_token);
      await this.saveBusinessIntegration(payload, tokens, profile);

      res.redirect(
        this.buildOAuthCallbackUrl({
          connected: payload.providerKey,
          providerKey: payload.providerKey,
        }),
      );
    } catch (err) {
      const message =
        err instanceof AppException
          ? err.message
          : 'oauth_connection_failed';
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: message,
          providerKey: payload.providerKey,
        }),
      );
    }
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

  private buildAuthorizationUrl(providerKey: string, state: string): string {
    const clientId = this.getGoogleClientId();
    const redirectUri = this.getGoogleRedirectUri();
    const scopes = getGoogleScopesForProvider(providerKey);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent select_account',
      state,
    });

    return `${GOOGLE_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  }

  private async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.getGoogleClientId(),
        client_secret: this.getGoogleClientSecret(),
        redirect_uri: this.getGoogleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to exchange Google authorization code',
        HttpStatus.BAD_REQUEST,
      );
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async fetchGoogleUserInfo(
    accessToken: string,
  ): Promise<GoogleUserInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to fetch Google user profile',
        HttpStatus.BAD_REQUEST,
      );
    }

    return (await response.json()) as GoogleUserInfo;
  }

  private async saveBusinessIntegration(
    payload: {
      businessId: string;
      userId: string;
      providerKey: string;
    },
    tokens: GoogleTokenResponse,
    profile: GoogleUserInfo,
  ): Promise<void> {
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();

    const credentialsPayload = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      scope: tokens.scope,
      tokenType: tokens.token_type,
    };

    const encryptedCredentials = encryptIntegrationCredentials(
      this.getEncryptionKey(),
      credentialsPayload,
    );

    const scopes = tokens.scope.split(' ').filter(Boolean);
    const now = new Date();

    const integration = await this.businessIntegrationRepository.upsert(
      payload.businessId,
      payload.providerKey,
      {
        status: IntegrationStatus.CONNECTED,
        config: {
          provider: 'google',
          scopes,
          googleUserId: profile.sub,
          picture: profile.picture ?? null,
        } as Prisma.InputJsonValue,
        credentials: { encrypted: encryptedCredentials } as Prisma.InputJsonValue,
        connectedAccountName: profile.name ?? null,
        connectedAccountEmail: profile.email ?? null,
        connectedAt: now,
        errorMessage: null,
      },
    );

    await this.auditService.log({
      actorUserId: payload.userId,
      businessId: payload.businessId,
      action: 'integration.connected',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: {
        providerKey: payload.providerKey,
        method: 'google_oauth',
        email: profile.email,
      },
    });
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

    if (!isGoogleOAuthProviderKey(providerKey)) {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_AVAILABLE,
        'Provider is not a supported Google OAuth integration',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertGoogleOAuthConfigured(): void {
    if (!this.isGoogleOAuthEnabled()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Google OAuth is not enabled',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private isGoogleOAuthEnabled(): boolean {
    return (
      (process.env.GOOGLE_OAUTH_ENABLED ?? 'false').toLowerCase() === 'true'
    );
  }

  private getGoogleClientId(): string {
    const value = process.env.GOOGLE_CLIENT_ID;
    if (!value) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Google OAuth client ID is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }

  private getGoogleClientSecret(): string {
    const value = process.env.GOOGLE_CLIENT_SECRET;
    if (!value) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Google OAuth client secret is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }

  private getGoogleRedirectUri(): string {
    return (
      process.env.GOOGLE_OAUTH_REDIRECT_URI ??
      'http://localhost:3000/api/v1/integrations/oauth/google/callback'
    );
  }

  private getFrontendBaseUrl(): string {
    return this.configService.get('app.frontendUrl', { infer: true });
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
