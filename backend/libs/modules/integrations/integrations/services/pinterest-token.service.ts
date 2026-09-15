import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { IntegrationStatus, Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from '@app/common/utils/integration-encryption.util';
import { getPinterestOAuthTokenUrl } from '../constants/pinterest-api.constants';
import { BusinessIntegrationRepository } from '../repositories/business-integration.repository';


export interface StoredPinterestCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
  tokenType: string;
  externalUserId?: string;
  refreshExpiresAt?: string | null;
}

interface PinterestRefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
}

@Injectable()
export class PinterestTokenService {
  private readonly logger = new Logger(PinterestTokenService.name);

  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
  ) {}

  async getAccessToken(businessId: string): Promise<string> {
    const credentials = await this.getStoredCredentials(businessId);
    return credentials.accessToken;
  }

  async getStoredCredentials(
    businessId: string,
  ): Promise<StoredPinterestCredentials> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'pinterest',
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        'Pinterest integration is not connected',
        HttpStatus.BAD_REQUEST,
      );
    }

    const encrypted = (
      integration.credentials as { encrypted?: string } | null
    )?.encrypted;
    if (!encrypted) {
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        'Pinterest integration has no stored credentials',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stored = decryptIntegrationCredentials(
      this.getEncryptionKey(),
      encrypted,
    ) as unknown as StoredPinterestCredentials;

    if (!this.isAccessTokenExpired(stored.expiresAt)) {
      return stored;
    }

    if (!stored.refreshToken) {
      await this.markExpired(
        businessId,
        'Access token expired with no refresh token',
      );
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        'Pinterest access token expired. Please reconnect.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      stored.refreshExpiresAt &&
      Date.now() >= new Date(stored.refreshExpiresAt).getTime() - 60_000
    ) {
      await this.markExpired(businessId, 'Refresh token expired');
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        'Pinterest refresh token expired. Please reconnect.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const refreshed = await this.refreshAccessToken(stored.refreshToken);
      const updated: StoredPinterestCredentials = {
        ...stored,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? stored.refreshToken,
        expiresAt: new Date(
          Date.now() + refreshed.expires_in * 1000,
        ).toISOString(),
        refreshExpiresAt:
          refreshed.refresh_token_expires_in !== undefined
            ? new Date(
                Date.now() + refreshed.refresh_token_expires_in * 1000,
              ).toISOString()
            : (stored.refreshExpiresAt ?? null),
        scope: refreshed.scope ?? stored.scope,
        tokenType: refreshed.token_type ?? stored.tokenType,
      };
      await this.persistCredentials(businessId, updated);
      this.logger.log(
        `Refreshed Pinterest access token for business=${businessId}`,
      );
      return updated;
    } catch (error) {
      this.logger.warn(
        `Pinterest token refresh failed for business=${businessId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.markExpired(
        businessId,
        'Failed to refresh Pinterest access token. Please reconnect.',
      );
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        'Pinterest access token expired. Please reconnect.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private isAccessTokenExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return Date.now() >= new Date(expiresAt).getTime() - 60_000;
  }

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<PinterestRefreshResponse> {
    const clientId = process.env.PINTEREST_OAUTH_CLIENT_ID?.trim();
    const clientSecret = process.env.PINTEREST_OAUTH_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Pinterest OAuth is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(getPinterestOAuthTokenUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const json = (await response.json()) as PinterestRefreshResponse & {
      message?: string;
      code?: number;
    };
    if (!response.ok || !json.access_token) {
      throw new Error(
        json.message || `Pinterest token refresh failed (${response.status})`,
      );
    }
    return json;
  }

  private async persistCredentials(
    businessId: string,
    credentials: StoredPinterestCredentials,
  ): Promise<void> {
    const encrypted = encryptIntegrationCredentials(
      this.getEncryptionKey(),
      credentials as unknown as Record<string, unknown>,
    );
    await this.businessIntegrationRepository.update(businessId, 'pinterest', {
      credentials: { encrypted } as Prisma.InputJsonValue,
      status: IntegrationStatus.CONNECTED,
      errorMessage: null,
    });
  }

  private async markExpired(
    businessId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.businessIntegrationRepository.update(businessId, 'pinterest', {
      status: IntegrationStatus.EXPIRED,
      errorMessage,
    });
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
