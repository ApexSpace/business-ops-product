import { HttpStatus, Injectable } from '@nestjs/common';
import { IntegrationStatus, Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from '@app/common/utils/integration-encryption.util';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { MetaConfigService } from './meta-config.service';

export interface StoredMetaCredentials {
  accessToken: string;
  expiresAt: string | null;
  tokenType: string;
  metaUserId: string;
  scopes: string[];
}

@Injectable()
export class MetaTokenService {
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly metaConfigService: MetaConfigService,
  ) {}

  async getAccessToken(
    businessId: string,
    providerKey: string,
  ): Promise<string> {
    const stored = await this.getStoredCredentials(businessId, providerKey);
    if (stored.expiresAt && this.isTokenExpired(stored.expiresAt)) {
      await this.markExpired(businessId, providerKey);
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Meta access token expired. Please reconnect.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return stored.accessToken;
  }

  async getStoredCredentials(
    businessId: string,
    providerKey: string,
  ): Promise<StoredMetaCredentials> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        providerKey,
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.INTEGRATION_NOT_FOUND,
        'Integration is not connected',
        HttpStatus.BAD_REQUEST,
      );
    }

    const credentials = integration.credentials as {
      encrypted?: string;
    } | null;

    if (!credentials?.encrypted) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Integration has no stored credentials',
        HttpStatus.BAD_REQUEST,
      );
    }

    return decryptIntegrationCredentials(
      this.metaConfigService.getEncryptionKey(),
      credentials.encrypted,
    ) as unknown as StoredMetaCredentials;
  }

  async persistCredentials(
    businessId: string,
    providerKey: string,
    credentials: StoredMetaCredentials,
  ): Promise<void> {
    const encrypted = encryptIntegrationCredentials(
      this.metaConfigService.getEncryptionKey(),
      credentials as unknown as Record<string, unknown>,
    );

    await this.businessIntegrationRepository.update(businessId, providerKey, {
      credentials: { encrypted },
    });
  }

  private isTokenExpired(expiresAt: string): boolean {
    return Date.now() >= new Date(expiresAt).getTime() - 60_000;
  }

  private async markExpired(
    businessId: string,
    providerKey: string,
  ): Promise<void> {
    await this.businessIntegrationRepository.update(businessId, providerKey, {
      status: IntegrationStatus.EXPIRED,
      errorMessage: 'Meta access token expired. Please reconnect.',
    });
  }
}
