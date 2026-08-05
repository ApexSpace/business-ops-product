import { HttpStatus, Injectable } from '@nestjs/common';
import { IntegrationStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { decryptIntegrationCredentials } from '@app/common/utils/integration-encryption.util';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import { GoogleTokenService } from '@app/modules/integrations/integrations/services/google-token.service';
import { TikTokTokenService } from '@app/modules/integrations/integrations/services/tiktok-token.service';
import { MetaTokenService } from '@app/modules/integrations/integrations/meta/services/meta-token.service';

const META_PROVIDER_KEYS = new Set(['facebook', 'instagram']);
const GOOGLE_PROVIDER_KEYS = new Set(['google-business-profile', 'youtube']);

interface StoredGenericCredentials {
  accessToken: string;
  expiresAt: string | null;
}

/**
 * Resolves a fresh access token for any supported social publish provider.
 * Meta, Google, and TikTok delegate to dedicated token services (refresh);
 * LinkedIn / X / Pinterest use stored tokens with expiry checks.
 */
@Injectable()
export class SocialTokenResolverService {
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly metaTokenService: MetaTokenService,
    private readonly googleTokenService: GoogleTokenService,
    private readonly tikTokTokenService: TikTokTokenService,
  ) {}

  async getAccessToken(
    businessId: string,
    providerKey: string,
    integrationResourceId?: string | null,
  ): Promise<string> {
    if (META_PROVIDER_KEYS.has(providerKey)) {
      const pageToken = await this.tryMetaPageAccessToken(
        businessId,
        integrationResourceId,
      );
      if (pageToken) return pageToken;
      return this.metaTokenService.getAccessToken(businessId, providerKey);
    }
    if (GOOGLE_PROVIDER_KEYS.has(providerKey)) {
      return this.googleTokenService.getAccessToken(businessId, providerKey);
    }
    if (providerKey === 'tiktok') {
      return this.tikTokTokenService.getAccessToken(businessId);
    }
    return this.getGenericAccessToken(businessId, providerKey);
  }

  private async tryMetaPageAccessToken(
    businessId: string,
    integrationResourceId?: string | null,
  ): Promise<string | null> {
    if (!integrationResourceId) return null;
    const resource =
      await this.integrationResourceRepository.findByIdAndBusiness(
        integrationResourceId,
        businessId,
      );
    if (!resource?.metadata || typeof resource.metadata !== 'object') {
      return null;
    }
    const metadata = resource.metadata as Record<string, unknown>;
    const encrypted = metadata.pageAccessTokenEncrypted;
    if (typeof encrypted !== 'string' || !encrypted) return null;
    const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!encryptionKey) return null;
    try {
      const decrypted = decryptIntegrationCredentials(
        encryptionKey,
        encrypted,
      ) as { pageAccessToken?: string };
      return decrypted.pageAccessToken?.trim() || null;
    } catch {
      return null;
    }
  }

  private async getGenericAccessToken(
    businessId: string,
    providerKey: string,
  ): Promise<string> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        providerKey,
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        `${providerKey} integration is not connected`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const stored = integration.credentials as { encrypted?: string } | null;
    if (!stored?.encrypted) {
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        `${providerKey} integration has no stored credentials`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const encryptionKey = this.getEncryptionKey();
    const credentials = decryptIntegrationCredentials(
      encryptionKey,
      stored.encrypted,
    ) as unknown as StoredGenericCredentials;

    if (
      credentials.expiresAt &&
      Date.now() >= new Date(credentials.expiresAt).getTime() - 60_000
    ) {
      await this.businessIntegrationRepository.update(businessId, providerKey, {
        status: IntegrationStatus.EXPIRED,
        errorMessage: `${providerKey} access token expired. Please reconnect.`,
      });
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        `${providerKey} access token expired. Please reconnect.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return credentials.accessToken;
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
