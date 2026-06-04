import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationConnectionType,
  IntegrationResourceType,
  IntegrationStatus,
  Prisma,
} from '@prisma/client';
import type { Response } from 'express';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { encryptIntegrationCredentials } from '@app/common/utils/integration-encryption.util';
import { RootConfig } from '@app/core/config/configuration';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  LINKEDIN_OAUTH_AUTHORIZE_URL,
  LINKEDIN_OAUTH_PROVIDER_KEY,
  LINKEDIN_OAUTH_SCOPES,
  LINKEDIN_OAUTH_TOKEN_URL,
  LINKEDIN_OIDC_USERINFO_URL,
  isLinkedInOAuthProviderKey,
} from './constants/linkedin-oauth.constants';
import { BusinessIntegrationRepository } from './repositories/business-integration.repository';
import { IntegrationProviderRepository } from './repositories/integration-provider.repository';
import { IntegrationResourceRepository } from './repositories/integration-resource.repository';
import {
  createLinkedInOAuthState,
  verifyLinkedInOAuthState,
} from './utils/linkedin-oauth-state.util';

type LinkedInTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
};

type LinkedInUserInfo = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  locale?: string;
  picture?: string;
};

@Injectable()
export class LinkedInOAuthService {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly providerRepository: IntegrationProviderRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly auditService: AuditService,
  ) {}

  async redirectToLinkedIn(user: RequestUser, res: Response): Promise<void> {
    this.assertLinkedInOAuthConfigured();
    await this.assertOAuthProvider(LINKEDIN_OAUTH_PROVIDER_KEY);

    const state = createLinkedInOAuthState(
      {
        businessId: user.businessId!,
        userId: user.id,
        providerKey: LINKEDIN_OAUTH_PROVIDER_KEY,
      },
      this.getStateSecret(),
    );

    const authorizationUrl = this.buildAuthorizationUrl(state);
    res.redirect(authorizationUrl);
  }

  async handleCallback(
    code: string | undefined,
    state: string | undefined,
    error: string | undefined,
    res: Response,
  ): Promise<void> {
    if (error || !code || !state) {
      res.redirect(this.buildOAuthCallbackUrl({ error: 'linkedin_oauth_failed' }));
      return;
    }

    let payload;
    try {
      payload = verifyLinkedInOAuthState(state, this.getStateSecret());
    } catch {
      res.redirect(this.buildOAuthCallbackUrl({ error: 'linkedin_oauth_failed' }));
      return;
    }

    if (!isLinkedInOAuthProviderKey(payload.providerKey)) {
      res.redirect(this.buildOAuthCallbackUrl({ error: 'linkedin_oauth_failed' }));
      return;
    }

    try {
      await this.assertOAuthProvider(payload.providerKey);
      const tokens = await this.exchangeCodeForTokens(code);
      const profile = await this.fetchLinkedInUserInfo(tokens.access_token);
      await this.saveBusinessIntegration(payload, tokens, profile);

      res.redirect(
        this.buildOAuthCallbackUrl({
          connected: payload.providerKey,
          providerKey: payload.providerKey,
        }),
      );
    } catch {
      res.redirect(this.buildOAuthCallbackUrl({ error: 'linkedin_oauth_failed' }));
    }
  }

  private buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.getLinkedInClientId(),
      redirect_uri: this.getLinkedInRedirectUri(),
      response_type: 'code',
      scope: [...LINKEDIN_OAUTH_SCOPES].join(' '),
      state,
    });
    return `${LINKEDIN_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  }

  private async exchangeCodeForTokens(code: string): Promise<LinkedInTokenResponse> {
    const response = await fetch(LINKEDIN_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.getLinkedInRedirectUri(),
        client_id: this.getLinkedInClientId(),
        client_secret: this.getLinkedInClientSecret(),
      }),
    });

    if (!response.ok) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to exchange LinkedIn authorization code',
        HttpStatus.BAD_REQUEST,
      );
    }

    return (await response.json()) as LinkedInTokenResponse;
  }

  private async fetchLinkedInUserInfo(
    accessToken: string,
  ): Promise<LinkedInUserInfo> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    const apiVersion = process.env.LINKEDIN_API_VERSION?.trim();
    if (apiVersion) {
      headers['LinkedIn-Version'] = apiVersion;
    }

    const response = await fetch(LINKEDIN_OIDC_USERINFO_URL, { headers });
    if (!response.ok) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to fetch LinkedIn user profile',
        HttpStatus.BAD_REQUEST,
      );
    }

    return (await response.json()) as LinkedInUserInfo;
  }

  private async saveBusinessIntegration(
    payload: {
      businessId: string;
      userId: string;
      providerKey: string;
    },
    tokens: LinkedInTokenResponse,
    profile: LinkedInUserInfo,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const scope = tokens.scope ?? [...LINKEDIN_OAUTH_SCOPES].join(' ');
    const scopes = scope.split(' ').filter(Boolean);

    const credentialsPayload = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      scope,
      tokenType: tokens.token_type ?? 'Bearer',
    };

    const encryptedCredentials = encryptIntegrationCredentials(
      this.getEncryptionKey(),
      credentialsPayload,
    );

    const now = new Date();
    const integration = await this.businessIntegrationRepository.upsert(
      payload.businessId,
      payload.providerKey,
      {
        status: IntegrationStatus.CONNECTED,
        config: {
          provider: 'linkedin',
          scopes,
          linkedInUserId: profile.sub,
          locale: profile.locale ?? null,
          picture: profile.picture ?? null,
        } as Prisma.InputJsonValue,
        credentials: { encrypted: encryptedCredentials } as Prisma.InputJsonValue,
        connectedAccountName: profile.name ?? null,
        connectedAccountEmail: profile.email ?? null,
        connectedAt: now,
        errorMessage: null,
      },
    );

    await this.integrationResourceRepository.upsertMany(
      integration.id,
      payload.businessId,
      payload.providerKey,
      [
        {
          externalId: profile.sub,
          name: profile.name ?? profile.email ?? 'LinkedIn member',
          type: IntegrationResourceType.OTHER,
          metadata: {
            email: profile.email ?? null,
            picture: profile.picture ?? null,
            locale: profile.locale ?? null,
            scopes,
          } as Prisma.InputJsonValue,
          lastSyncedAt: now,
        },
      ],
    );

    await this.auditService.log({
      actorUserId: payload.userId,
      businessId: payload.businessId,
      action: 'integration.connected',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: {
        providerKey: payload.providerKey,
        method: 'linkedin_oauth',
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

    if (!isLinkedInOAuthProviderKey(providerKey)) {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_AVAILABLE,
        'Provider is not a supported LinkedIn OAuth integration',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertLinkedInOAuthConfigured(): void {
    if (!this.isLinkedInOAuthEnabled()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI.',
        HttpStatus.BAD_REQUEST,
      );
    }
    // If enabled but incomplete, Joi env validation should already fail at boot.
    // Keep defensive runtime checks too.
    this.getLinkedInClientId();
    this.getLinkedInClientSecret();
    this.getLinkedInRedirectUri();
    this.getEncryptionKey();
  }

  private isLinkedInOAuthEnabled(): boolean {
    return (
      (process.env.LINKEDIN_OAUTH_ENABLED ?? 'false').toLowerCase() === 'true'
    );
  }

  private getLinkedInClientId(): string {
    const value = process.env.LINKEDIN_CLIENT_ID;
    if (!value) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }

  private getLinkedInClientSecret(): string {
    const value = process.env.LINKEDIN_CLIENT_SECRET;
    if (!value) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }

  private getLinkedInRedirectUri(): string {
    const value =
      process.env.LINKEDIN_REDIRECT_URI ??
      'http://localhost:3000/api/v1/integrations/oauth/linkedin/callback';
    if (!value) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
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

