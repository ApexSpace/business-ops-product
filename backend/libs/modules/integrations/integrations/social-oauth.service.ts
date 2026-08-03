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
import { resolveOAuthRedirectUri } from '@app/core/config/oauth-redirect-uri.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  SOCIAL_OAUTH_PROVIDER_CONFIG,
  type SocialOAuthProviderKey,
  isSocialOAuthProviderKey,
} from './constants/social-oauth.constants';
import { BusinessIntegrationRepository } from './repositories/business-integration.repository';
import { IntegrationProviderRepository } from './repositories/integration-provider.repository';
import { IntegrationResourceRepository } from './repositories/integration-resource.repository';
import {
  createPkceChallenge,
  createPkceVerifier,
  createSocialOAuthState,
  verifySocialOAuthState,
} from './utils/social-oauth-state.util';

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  open_id?: string;
};

@Injectable()
export class SocialOAuthService {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly providerRepository: IntegrationProviderRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly auditService: AuditService,
  ) {}

  async redirectToProvider(
    user: RequestUser,
    providerKey: string,
    res: Response,
  ): Promise<void> {
    if (!isSocialOAuthProviderKey(providerKey)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Unsupported social OAuth provider: ${providerKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const config = SOCIAL_OAUTH_PROVIDER_CONFIG[providerKey];
    this.assertConfigured(providerKey);
    await this.assertOAuthProvider(providerKey);

    const codeVerifier =
      providerKey === 'x' ? createPkceVerifier() : undefined;
    const state = createSocialOAuthState(
      {
        businessId: user.businessId!,
        userId: user.id,
        providerKey,
        codeVerifier,
      },
      this.getStateSecret(),
    );

    const params = new URLSearchParams({
      redirect_uri: this.getRedirectUri(providerKey),
      response_type: 'code',
      scope: config.scopes.join(providerKey === 'tiktok' ? ',' : ' '),
      state,
    });

    if (providerKey === 'tiktok') {
      params.set('client_key', this.getClientId(providerKey));
    } else {
      params.set('client_id', this.getClientId(providerKey));
    }

    if (providerKey === 'x' && codeVerifier) {
      params.set('code_challenge', createPkceChallenge(codeVerifier));
      params.set('code_challenge_method', 'S256');
    }

    res.redirect(`${config.authorizeUrl}?${params.toString()}`);
  }

  async handleCallback(
    providerKey: string,
    code: string | undefined,
    state: string | undefined,
    error: string | undefined,
    res: Response,
  ): Promise<void> {
    if (error || !code || !state || !isSocialOAuthProviderKey(providerKey)) {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: `${providerKey}_oauth_failed`,
          providerKey,
        }),
      );
      return;
    }

    let payload;
    try {
      payload = verifySocialOAuthState(state, this.getStateSecret());
    } catch {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: `${providerKey}_oauth_failed`,
          providerKey,
        }),
      );
      return;
    }

    if (payload.providerKey !== providerKey) {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: `${providerKey}_oauth_failed`,
          providerKey,
        }),
      );
      return;
    }

    try {
      await this.assertOAuthProvider(providerKey);
      const tokens = await this.exchangeCodeForTokens(
        providerKey,
        code,
        payload.codeVerifier,
      );
      const profile = await this.fetchProfile(providerKey, tokens);
      await this.saveBusinessIntegration(payload, tokens, profile);

      res.redirect(
        this.buildOAuthCallbackUrl({
          connected: providerKey,
          providerKey,
        }),
      );
    } catch {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: `${providerKey}_oauth_failed`,
          providerKey,
        }),
      );
    }
  }

  private async exchangeCodeForTokens(
    providerKey: SocialOAuthProviderKey,
    code: string,
    codeVerifier?: string,
  ): Promise<TokenResponse> {
    const config = SOCIAL_OAUTH_PROVIDER_CONFIG[providerKey];
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getRedirectUri(providerKey),
    });

    if (providerKey === 'tiktok') {
      body.set('client_key', this.getClientId(providerKey));
      body.set('client_secret', this.getClientSecret(providerKey));
    } else if (providerKey !== 'x') {
      body.set('client_id', this.getClientId(providerKey));
      body.set('client_secret', this.getClientSecret(providerKey));
    }

    if (providerKey === 'x' && codeVerifier) {
      body.set('code_verifier', codeVerifier);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (providerKey === 'x') {
      const basic = Buffer.from(
        `${this.getClientId(providerKey)}:${this.getClientSecret(providerKey)}`,
      ).toString('base64');
      headers.Authorization = `Basic ${basic}`;
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers,
      body,
    });
    if (!response.ok) {
      throw new Error(`Token exchange failed (${response.status})`);
    }
    const json = (await response.json()) as TokenResponse & {
      data?: TokenResponse;
    };
    return json.data ?? json;
  }

  private async fetchProfile(
    providerKey: SocialOAuthProviderKey,
    tokens: TokenResponse,
  ): Promise<{ id: string; name?: string; email?: string }> {
    const config = SOCIAL_OAUTH_PROVIDER_CONFIG[providerKey];
    if (!config.userInfoUrl) {
      return { id: tokens.open_id ?? `${providerKey}-user` };
    }

    const response = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!response.ok) {
      return { id: tokens.open_id ?? `${providerKey}-user` };
    }

    const json = (await response.json()) as Record<string, unknown>;
    if (providerKey === 'x') {
      const data = json.data as {
        id?: string;
        name?: string;
        username?: string;
      };
      return {
        id: data?.id ?? 'x-user',
        name: data?.name ?? data?.username,
      };
    }
    if (providerKey === 'pinterest') {
      return {
        id: String(json.id ?? json.username ?? 'pinterest-user'),
        name: String(json.username ?? json.business_name ?? 'Pinterest'),
      };
    }
    if (providerKey === 'tiktok') {
      const data = (
        json.data as { user?: { open_id?: string; display_name?: string } }
      )?.user;
      return {
        id: data?.open_id ?? tokens.open_id ?? 'tiktok-user',
        name: data?.display_name,
      };
    }
    return { id: 'unknown' };
  }

  private async saveBusinessIntegration(
    payload: {
      businessId: string;
      userId: string;
      providerKey: string;
    },
    tokens: TokenResponse,
    profile: { id: string; name?: string; email?: string },
  ): Promise<void> {
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;
    const scopes = (tokens.scope ?? '')
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const encryptedCredentials = encryptIntegrationCredentials(
      this.getEncryptionKey(),
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        scope: tokens.scope ?? null,
        tokenType: tokens.token_type ?? 'Bearer',
        externalUserId: profile.id,
      },
    );

    const now = new Date();
    const integration = await this.businessIntegrationRepository.upsert(
      payload.businessId,
      payload.providerKey,
      {
        status: IntegrationStatus.CONNECTED,
        credentials: {
          encrypted: encryptedCredentials,
        } as Prisma.InputJsonValue,
        config: {
          scopes,
          externalUserId: profile.id,
        } as Prisma.InputJsonValue,
        connectedAccountName: profile.name ?? null,
        connectedAccountEmail: profile.email ?? null,
        connectedAt: now,
        errorMessage: null,
      },
    );

    const resourceType =
      payload.providerKey === 'x'
        ? IntegrationResourceType.X_USER
        : payload.providerKey === 'pinterest'
          ? IntegrationResourceType.PINTEREST_BOARD
          : IntegrationResourceType.TIKTOK_USER;

    await this.integrationResourceRepository.upsertMany(
      integration.id,
      payload.businessId,
      payload.providerKey,
      [
        {
          externalId: profile.id,
          name: profile.name ?? payload.providerKey,
          type: resourceType,
          metadata: { source: 'oauth' },
          lastSyncedAt: now,
          isSelected: true,
          isDefault: true,
        },
      ],
    );

    await this.auditService.log({
      actorUserId: payload.userId,
      businessId: payload.businessId,
      action: 'integration.connected',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: { providerKey: payload.providerKey },
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
  }

  private assertConfigured(providerKey: SocialOAuthProviderKey): void {
    if (!this.getClientId(providerKey) || !this.getClientSecret(providerKey)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `${providerKey} OAuth is not configured. Set client id/secret env vars.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private getClientId(providerKey: SocialOAuthProviderKey): string {
    const envKey = SOCIAL_OAUTH_PROVIDER_CONFIG[providerKey].clientIdEnv;
    return (process.env[envKey] ?? '').trim();
  }

  private getClientSecret(providerKey: SocialOAuthProviderKey): string {
    const envKey = SOCIAL_OAUTH_PROVIDER_CONFIG[providerKey].clientSecretEnv;
    return (process.env[envKey] ?? '').trim();
  }

  private getRedirectUri(providerKey: SocialOAuthProviderKey): string {
    const envMap: Record<SocialOAuthProviderKey, string> = {
      x: 'X_OAUTH_REDIRECT_URI',
      pinterest: 'PINTEREST_OAUTH_REDIRECT_URI',
      tiktok: 'TIKTOK_OAUTH_REDIRECT_URI',
    };
    return resolveOAuthRedirectUri(process.env, {
      explicitEnvValue: process.env[envMap[providerKey]],
      callbackPath: `integrations/oauth/${providerKey}/callback`,
    });
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

  private buildOAuthCallbackUrl(params: {
    connected?: string;
    error?: string;
    providerKey?: string;
  }): string {
    const frontendBase = this.configService.get('app.frontendUrl', {
      infer: true,
    });
    const url = new URL(`${frontendBase}/oauth/callback`);
    if (params.connected) url.searchParams.set('connected', params.connected);
    if (params.error) url.searchParams.set('error', params.error);
    if (params.providerKey)
      url.searchParams.set('providerKey', params.providerKey);
    return url.toString();
  }
}
