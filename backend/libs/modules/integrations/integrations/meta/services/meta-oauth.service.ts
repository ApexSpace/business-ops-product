import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationConnectionType,
  IntegrationStatus,
  Prisma,
} from '@prisma/client';
import { Response } from 'express';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { encryptIntegrationCredentials } from '@app/common/utils/integration-encryption.util';
import { RootConfig } from '@app/core/config/configuration';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { getMetaScopesForProvider } from '../constants/meta-oauth.constants';
import {
  buildMetaOAuthAuthorizationUrl,
  getOAuthAuthorizeUrlHost,
} from '../utils/meta-oauth-url.util';
import { tryResolveProviderKeyFromOAuthState } from '../utils/meta-oauth-callback.util';
import { resolveMetaWebhookStatusLabel } from '../utils/meta-webhook-status.util';
import {
  getMetaProviderConfig,
  isMetaBusinessOAuthProviderKey,
  isMetaProviderKey,
  META_WHATSAPP_PROVIDER_KEY,
  type MetaBusinessOAuthProviderKey,
} from '../constants/meta-provider.config';
import {
  createMetaOAuthState,
  verifyMetaOAuthState,
} from '../utils/meta-oauth-state.util';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { IntegrationProviderRepository } from '../../repositories/integration-provider.repository';
import { MetaApiClient } from './meta-api-client';
import {
  META_ENV_NOT_CONFIGURED_MESSAGE,
  MetaConfigService,
} from './meta-config.service';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import { StoredMetaCredentials } from './meta-token.service';

@Injectable()
export class MetaOAuthService {
  private readonly logger = new Logger(MetaOAuthService.name);

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly metaConfigService: MetaConfigService,
    private readonly metaApiClient: MetaApiClient,
    private readonly jobEnqueueService: JobEnqueueService,
    private readonly providerRepository: IntegrationProviderRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly auditService: AuditService,
  ) {}

  getClientConfig() {
    this.assertMetaOAuthConfigured();
    return this.metaConfigService.getClientConfigForFrontend();
  }

  async redirectToMeta(
    user: RequestUser,
    providerKey: string | undefined,
    res: Response,
  ): Promise<void> {
    this.assertMetaOAuthConfigured();

    if (!providerKey?.trim()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'providerKey is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalizedKey = providerKey.trim();

    this.logger.log(`Meta OAuth start providerKey=${normalizedKey}`);

    if (!isMetaBusinessOAuthProviderKey(normalizedKey)) {
      if (normalizedKey === META_WHATSAPP_PROVIDER_KEY) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Use /integrations/oauth/meta/whatsapp/start for WhatsApp embedded signup',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Unsupported Meta providerKey "${normalizedKey}". Expected facebook or instagram.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.assertMetaOAuthProvider(normalizedKey);

    const providerConfig = getMetaProviderConfig(normalizedKey)!;
    const state = createMetaOAuthState(
      {
        businessId: user.businessId!,
        userId: user.id,
        providerKey: normalizedKey,
        flowType: providerConfig.flowType,
      },
      this.metaConfigService.getStateSecret(),
    );

    const authUrl = this.buildAuthorizationUrl(normalizedKey, state);
    this.logOAuthStartDebug(normalizedKey, authUrl);

    res.redirect(authUrl);
  }

  async handleCallback(
    code: string | undefined,
    state: string | undefined,
    error: string | undefined,
    res: Response,
  ): Promise<void> {
    const stateSecret = this.metaConfigService.getStateSecret();
    const providerKeyFromState = tryResolveProviderKeyFromOAuthState(
      state,
      stateSecret,
    );

    if (error) {
      const errorDescription =
        typeof error === 'string' ? error : 'meta_oauth_denied';
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: errorDescription,
          providerKey: providerKeyFromState,
        }),
      );
      return;
    }

    if (!code || !state) {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: 'missing_oauth_params',
          providerKey: providerKeyFromState,
        }),
      );
      return;
    }

    let payload;
    try {
      payload = verifyMetaOAuthState(state, stateSecret);
    } catch {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: 'invalid_oauth_state',
          providerKey: providerKeyFromState,
        }),
      );
      return;
    }

    this.logger.log(
      `[Meta OAuth] callback reached providerKey=${payload.providerKey} flowType=${payload.flowType}`,
    );

    if (payload.flowType !== 'META_OAUTH') {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: 'invalid_oauth_flow',
          providerKey: payload.providerKey,
        }),
      );
      return;
    }

    if (!isMetaBusinessOAuthProviderKey(payload.providerKey)) {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: 'invalid_provider',
          providerKey: payload.providerKey,
        }),
      );
      return;
    }

    const oauthProviderKey = payload.providerKey;

    try {
      await this.assertMetaOAuthProvider(oauthProviderKey);
      const shortLived = await this.metaApiClient.exchangeCodeForToken(
        code,
        oauthProviderKey,
      );
      const longLived = await this.metaApiClient.exchangeForLongLivedToken(
        shortLived.access_token,
      );
      const profile = await this.metaApiClient.getUserProfile(
        longLived.access_token,
      );

      const expiresAt = longLived.expires_in
        ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
        : null;

      await this.saveBusinessIntegration(
        {
          businessId: payload.businessId,
          userId: payload.userId,
          providerKey: oauthProviderKey,
        },
        {
          accessToken: longLived.access_token,
          expiresAt,
          tokenType: longLived.token_type ?? 'bearer',
          metaUserId: profile.id,
          scopes: getMetaScopesForProvider(oauthProviderKey),
        },
        profile,
      );

      this.logger.log(
        `Meta OAuth saved BusinessIntegration providerKey=${oauthProviderKey}`,
      );

      const asyncJob = await this.jobEnqueueService.enqueueMetaResourceSync({
        businessId: payload.businessId,
        providerKey: oauthProviderKey,
        idempotencyKey: `meta-oauth-sync-${payload.businessId}-${oauthProviderKey}`,
      });

      this.logger.log(
        `[Meta OAuth] enqueued resource sync jobId=${asyncJob.id} providerKey=${oauthProviderKey}`,
      );

      res.redirect(
        this.buildOAuthCallbackUrl({
          connected: oauthProviderKey,
          providerKey: oauthProviderKey,
          jobId: asyncJob.id,
        }),
      );
    } catch (err) {
      const message =
        err instanceof AppException ? err.message : 'oauth_connection_failed';
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: message,
          providerKey: payload.providerKey,
        }),
      );
    }
  }

  private buildAuthorizationUrl(
    providerKey: MetaBusinessOAuthProviderKey,
    state: string,
  ): string {
    const { appId } = this.metaConfigService.getMetaAppConfig();
    const { configId: loginConfigId, source: configIdSource } =
      this.metaConfigService.assertLoginConfigForOAuth(providerKey);
    const redirectUri = this.metaConfigService.getMetaRedirectUri(providerKey);
    const scopes = getMetaScopesForProvider(providerKey);

    if (providerKey === 'instagram') {
      this.metaConfigService.logInstagramFacebookLoginSetupHint();
    }

    if (scopes.length === 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `No OAuth scopes configured for provider ${providerKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    let authUrl: string;
    try {
      authUrl = buildMetaOAuthAuthorizationUrl({
        appId,
        redirectUri,
        scopes,
        state,
        configId: loginConfigId,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Invalid Meta OAuth authorization URL';
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        message,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (this.isMetaOAuthDebugEnabled()) {
      this.logger.log(
        `[Meta OAuth] providerKey=${providerKey} configIdSource=${configIdSource} authorizeHost=${getOAuthAuthorizeUrlHost(authUrl)} redirectUri=${redirectUri}`,
      );
    }

    return authUrl;
  }

  private logOAuthStartDebug(providerKey: string, authUrl: string): void {
    if (!this.isMetaOAuthDebugEnabled()) {
      return;
    }
    const redirectUri = this.metaConfigService.getMetaRedirectUri(providerKey);
    this.logger.log(
      `[Meta OAuth] start providerKey=${providerKey} authorizeHost=${getOAuthAuthorizeUrlHost(authUrl)} redirectUri=${redirectUri}`,
    );
  }

  private isMetaOAuthDebugEnabled(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      (process.env.META_OAUTH_DEBUG ?? '').toLowerCase() === 'true'
    );
  }

  private async saveBusinessIntegration(
    payload: {
      businessId: string;
      userId: string;
      providerKey: MetaBusinessOAuthProviderKey;
    },
    credentials: StoredMetaCredentials,
    profile: { id: string; name?: string; email?: string },
  ): Promise<void> {
    const encryptedCredentials = encryptIntegrationCredentials(
      this.metaConfigService.getEncryptionKey(),
      credentials as unknown as Record<string, unknown>,
    );

    const { webhookVerifyToken } = this.metaConfigService.getMetaAppConfig();

    const integration = await this.businessIntegrationRepository.upsert(
      payload.businessId,
      payload.providerKey,
      {
        status: IntegrationStatus.CONNECTED,
        config: {
          provider: 'meta',
          flowType: 'META_OAUTH',
          scopes: credentials.scopes,
          metaUserId: profile.id,
          webhookStatus: resolveMetaWebhookStatusLabel(webhookVerifyToken),
        },
        credentials: {
          encrypted: encryptedCredentials,
        },
        connectedAccountName: profile.name ?? null,
        connectedAccountEmail: profile.email ?? null,
        connectedAt: new Date(),
        errorMessage: null,
      },
    );

    const auditAction =
      payload.providerKey === 'facebook'
        ? 'facebook.connected'
        : 'instagram.connected';

    await this.auditService.log({
      actorUserId: payload.userId,
      businessId: payload.businessId,
      action: auditAction,
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: {
        providerKey: payload.providerKey,
        method: 'meta_oauth',
        email: profile.email,
      },
    });
  }

  private async assertMetaOAuthProvider(
    providerKey: MetaBusinessOAuthProviderKey,
  ): Promise<void> {
    const provider = await this.providerRepository.findByKey(providerKey);
    const config = getMetaProviderConfig(providerKey);

    if (!config || config.flowType !== 'META_OAUTH') {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_AVAILABLE,
        'Provider is not a supported Meta OAuth integration',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      !provider ||
      !provider.isActive ||
      !provider.isBusinessLevel ||
      provider.connectionType !== IntegrationConnectionType.OAUTH
    ) {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_AVAILABLE,
        'Integration provider is not available for Meta OAuth',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (provider.connectionType !== config.connectionType) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Provider ${providerKey} connection type mismatch. Expected OAuth.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertMetaOAuthConfigured(): void {
    if (!this.metaConfigService.isMetaOAuthEnabled()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Meta OAuth is not enabled. Set META_OAUTH_ENABLED=true and configure META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI.',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      this.metaConfigService.getMetaAppConfig();
    } catch (err) {
      if (err instanceof AppException) throw err;
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        META_ENV_NOT_CONFIGURED_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private buildOAuthCallbackUrl(params: {
    connected?: string;
    error?: string;
    providerKey?: string;
    warning?: string;
    jobId?: string;
  }): string {
    const frontendBase = this.configService.get('app.frontendUrl', {
      infer: true,
    });
    const url = new URL(`${frontendBase}/oauth/callback`);
    if (params.connected) {
      url.searchParams.set('connected', params.connected);
    }
    if (params.error) {
      url.searchParams.set('error', params.error);
    }
    if (params.warning) {
      url.searchParams.set('warning', params.warning);
    }
    if (params.providerKey && isMetaProviderKey(params.providerKey)) {
      url.searchParams.set('providerKey', params.providerKey);
    }
    if (params.jobId) {
      url.searchParams.set('jobId', params.jobId);
    }
    return url.toString();
  }
}
