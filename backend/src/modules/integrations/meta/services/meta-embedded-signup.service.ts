import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationConnectionType,
  IntegrationResourceType,
  IntegrationStatus,
  Prisma,
} from '@prisma/client';
import { Response } from 'express';
import { RequestUser } from '../../../../common/decorators/current-user.decorator';
import { AppException } from '../../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../../common/exceptions/error-code.enum';
import { encryptIntegrationCredentials } from '../../../../common/utils/integration-encryption.util';
import { RootConfig } from '../../../../config/configuration';
import { AuditService } from '../../../audit/services/audit.service';
import {
  getMetaOAuthAuthorizeUrl,
  getMetaScopesForProvider,
  META_WHATSAPP_PROVIDER_KEY,
  WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE,
} from '../constants/meta-oauth.constants';
import { getMetaProviderConfig } from '../constants/meta-provider.config';
import {
  createMetaOAuthState,
  verifyMetaOAuthState,
} from '../utils/meta-oauth-state.util';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { IntegrationProviderRepository } from '../../repositories/integration-provider.repository';
import { IntegrationResourceRepository } from '../../repositories/integration-resource.repository';
import { tryResolveProviderKeyFromOAuthState } from '../utils/meta-oauth-callback.util';
import { resolveMetaWebhookStatusLabel } from '../utils/meta-webhook-status.util';
import { MetaApiClient } from './meta-api-client';
import {
  META_ENV_NOT_CONFIGURED_MESSAGE,
  MetaConfigService,
} from './meta-config.service';
import { MetaResourceSyncService } from './meta-resource-sync.service';
import { StoredMetaCredentials } from './meta-token.service';

import { WhatsAppEmbeddedSignupCompleteDto } from '../dto/whatsapp-embedded-signup.dto';

@Injectable()
export class MetaEmbeddedSignupService {
  private readonly logger = new Logger(MetaEmbeddedSignupService.name);

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly metaConfigService: MetaConfigService,
    private readonly metaApiClient: MetaApiClient,
    private readonly metaResourceSyncService: MetaResourceSyncService,
    private readonly providerRepository: IntegrationProviderRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly resourceRepository: IntegrationResourceRepository,
    private readonly auditService: AuditService,
  ) {}

  async redirectToWhatsAppSignup(
    user: RequestUser,
    res: Response,
  ): Promise<void> {
    this.assertMetaOAuthConfigured();
    await this.assertWhatsAppProvider();
    this.assertWhatsAppEmbeddedSignupConfigured();

    this.logger.log('Meta WhatsApp embedded signup start');

    const state = createMetaOAuthState(
      {
        businessId: user.businessId!,
        userId: user.id,
        providerKey: META_WHATSAPP_PROVIDER_KEY,
        flowType: 'WHATSAPP_EMBEDDED_SIGNUP',
      },
      this.metaConfigService.getStateSecret(),
    );

    const authUrl = this.buildWhatsAppAuthorizationUrl(state);
    this.logger.log(
      'Meta WhatsApp auth URL generated flowType=WHATSAPP_EMBEDDED_SIGNUP',
    );

    res.redirect(authUrl);
  }

  async handleCallback(
    code: string | undefined,
    state: string | undefined,
    error: string | undefined,
    res: Response,
  ): Promise<void> {
    const stateSecret = this.metaConfigService.getStateSecret();
    const providerKeyFromState =
      tryResolveProviderKeyFromOAuthState(state, stateSecret) ??
      META_WHATSAPP_PROVIDER_KEY;

    if (error) {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error,
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
      `Meta WhatsApp callback providerKey=${payload.providerKey} flowType=${payload.flowType}`,
    );

    if (
      payload.providerKey !== META_WHATSAPP_PROVIDER_KEY ||
      payload.flowType !== 'WHATSAPP_EMBEDDED_SIGNUP'
    ) {
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: 'invalid_provider',
          providerKey: payload.providerKey,
        }),
      );
      return;
    }

    try {
      await this.completeWithCode(payload, code);
      this.logger.log(
        `Meta WhatsApp saved BusinessIntegration providerKey=${META_WHATSAPP_PROVIDER_KEY}`,
      );
      res.redirect(
        this.buildOAuthCallbackUrl({
          connected: META_WHATSAPP_PROVIDER_KEY,
          providerKey: META_WHATSAPP_PROVIDER_KEY,
        }),
      );
    } catch (err) {
      const message =
        err instanceof AppException
          ? err.message
          : 'whatsapp_signup_failed';
      res.redirect(
        this.buildOAuthCallbackUrl({
          error: message,
          providerKey: META_WHATSAPP_PROVIDER_KEY,
        }),
      );
    }
  }

  async completeEmbeddedSignup(
    businessId: string,
    userId: string,
    dto: WhatsAppEmbeddedSignupCompleteDto,
  ): Promise<void> {
    this.assertMetaOAuthConfigured();
    await this.assertWhatsAppProvider();
    this.assertWhatsAppEmbeddedSignupConfigured();

    if (dto.code) {
      await this.completeWithCode(
        {
          businessId,
          userId,
          providerKey: META_WHATSAPP_PROVIDER_KEY,
        },
        dto.code,
      );
    }

    if (dto.phoneNumberId) {
      if (!dto.code) {
        await this.saveWhatsAppIntegration(
          { businessId, userId, providerKey: META_WHATSAPP_PROVIDER_KEY },
          {
            accessToken: '',
            expiresAt: null,
            tokenType: 'embedded_signup',
            metaUserId: dto.wabaId ?? 'embedded',
            scopes: getMetaScopesForProvider(META_WHATSAPP_PROVIDER_KEY),
          },
          {
            name: dto.verifiedName ?? dto.displayPhoneNumber ?? 'WhatsApp',
            email: null,
            wabaId: dto.wabaId,
            phoneNumberId: dto.phoneNumberId,
            displayPhoneNumber: dto.displayPhoneNumber,
            verifiedName: dto.verifiedName,
          },
        );
      } else {
        const integration =
          await this.businessIntegrationRepository.findByBusinessAndKey(
            businessId,
            META_WHATSAPP_PROVIDER_KEY,
          );
        if (integration) {
          const existingConfig =
            (integration.config as Record<string, unknown> | null) ?? {};
          await this.businessIntegrationRepository.update(
            businessId,
            META_WHATSAPP_PROVIDER_KEY,
            {
              config: {
                ...existingConfig,
                wabaId: dto.wabaId ?? existingConfig.wabaId ?? null,
                phoneNumberId: dto.phoneNumberId,
                displayPhoneNumber:
                  dto.displayPhoneNumber ??
                  existingConfig.displayPhoneNumber ??
                  null,
                verifiedName:
                  dto.verifiedName ?? existingConfig.verifiedName ?? null,
              } as Prisma.InputJsonValue,
            },
          );
        }
      }

      await this.upsertEmbeddedSignupPhoneResource(
        businessId,
        dto.phoneNumberId,
        dto.wabaId,
        dto.displayPhoneNumber,
        dto.verifiedName,
      );
      return;
    }

    if (dto.code) {
      return;
    }

    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'code or phoneNumberId is required',
      HttpStatus.BAD_REQUEST,
    );
  }

  private async completeWithCode(
    payload: { businessId: string; userId: string; providerKey: string },
    code: string,
  ): Promise<void> {
    const shortLived = await this.metaApiClient.exchangeCodeForToken(
      code,
      META_WHATSAPP_PROVIDER_KEY,
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

    await this.saveWhatsAppIntegration(
      payload,
      {
        accessToken: longLived.access_token,
        expiresAt,
        tokenType: longLived.token_type ?? 'bearer',
        metaUserId: profile.id,
        scopes: getMetaScopesForProvider(META_WHATSAPP_PROVIDER_KEY),
      },
      {
        name: profile.name ?? 'WhatsApp Business',
        email: profile.email ?? null,
      },
    );

    await this.metaResourceSyncService.syncAfterConnect(
      payload.businessId,
      META_WHATSAPP_PROVIDER_KEY,
    );
  }

  private async saveWhatsAppIntegration(
    payload: { businessId: string; userId: string; providerKey: string },
    credentials: StoredMetaCredentials,
    extra: {
      name: string;
      email: string | null;
      wabaId?: string;
      phoneNumberId?: string;
      displayPhoneNumber?: string;
      verifiedName?: string;
    },
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
          flowType: 'WHATSAPP_EMBEDDED_SIGNUP',
          scopes: credentials.scopes,
          metaUserId: credentials.metaUserId,
          wabaId: extra.wabaId ?? null,
          phoneNumberId: extra.phoneNumberId ?? null,
          displayPhoneNumber: extra.displayPhoneNumber ?? null,
          verifiedName: extra.verifiedName ?? null,
          webhookStatus: resolveMetaWebhookStatusLabel(webhookVerifyToken),
        } as Prisma.InputJsonValue,
        credentials: { encrypted: encryptedCredentials } as Prisma.InputJsonValue,
        connectedAccountName: extra.name,
        connectedAccountEmail: extra.email,
        connectedAt: new Date(),
        errorMessage: null,
      },
    );

    await this.auditService.log({
      actorUserId: payload.userId,
      businessId: payload.businessId,
      action: 'whatsapp.connected',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: {
        providerKey: META_WHATSAPP_PROVIDER_KEY,
        method: 'embedded_signup',
      },
    });
  }

  private buildWhatsAppAuthorizationUrl(state: string): string {
    const { appId } = this.metaConfigService.getMetaAppConfig();
    const embeddedSignupConfigId =
      this.metaConfigService.assertEmbeddedSignupConfigForWhatsApp();
    const redirectUri = this.metaConfigService.getMetaRedirectUri(
      META_WHATSAPP_PROVIDER_KEY,
    );
    const scopes = getMetaScopesForProvider(META_WHATSAPP_PROVIDER_KEY);

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(','),
      state,
      config_id: embeddedSignupConfigId,
    });

    return `${getMetaOAuthAuthorizeUrl()}?${params.toString()}`;
  }

  private async upsertEmbeddedSignupPhoneResource(
    businessId: string,
    phoneNumberId: string,
    wabaId?: string,
    displayPhoneNumber?: string,
    verifiedName?: string,
  ): Promise<void> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        META_WHATSAPP_PROVIDER_KEY,
      );
    if (!integration) return;

    const now = new Date();
    const resources = await this.resourceRepository.upsertMany(
      integration.id,
      businessId,
      META_WHATSAPP_PROVIDER_KEY,
      [
        {
          externalId: phoneNumberId,
          name: verifiedName ?? displayPhoneNumber ?? phoneNumberId,
          type: IntegrationResourceType.PHONE_NUMBER,
          metadata: {
            wabaId: wabaId ?? null,
            phoneNumberId,
            displayPhoneNumber: displayPhoneNumber ?? null,
            verifiedName: verifiedName ?? null,
            source: 'embedded_signup',
          },
          lastSyncedAt: now,
        },
      ],
    );

    if (resources.length > 0 && !resources.some((r) => r.isDefault)) {
      await this.resourceRepository.update(resources[0].id, {
        isDefault: true,
        isSelected: true,
      });
    }
  }

  private assertWhatsAppEmbeddedSignupConfigured(): void {
    this.metaConfigService.assertEmbeddedSignupConfigForWhatsApp();
  }

  private async assertWhatsAppProvider(): Promise<void> {
    const provider = await this.providerRepository.findByKey(
      META_WHATSAPP_PROVIDER_KEY,
    );
    const config = getMetaProviderConfig(META_WHATSAPP_PROVIDER_KEY);

    if (!config || config.flowType !== 'WHATSAPP_EMBEDDED_SIGNUP') {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_AVAILABLE,
        'WhatsApp provider configuration is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      !provider ||
      !provider.isActive ||
      !provider.isBusinessLevel ||
      provider.connectionType !== IntegrationConnectionType.EMBEDDED_SIGNUP
    ) {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_AVAILABLE,
        'WhatsApp provider is not available for embedded signup',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (provider.connectionType !== config.connectionType) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'WhatsApp provider connection type mismatch. Expected EMBEDDED_SIGNUP.',
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
    if (params.providerKey) {
      url.searchParams.set('providerKey', params.providerKey);
    }
    return url.toString();
  }
}
