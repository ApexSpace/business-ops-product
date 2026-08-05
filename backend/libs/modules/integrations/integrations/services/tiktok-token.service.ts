import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { IntegrationStatus, Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from '@app/common/utils/integration-encryption.util';
import { BusinessIntegrationRepository } from '../repositories/business-integration.repository';

const TIKTOK_OAUTH_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_OAUTH_REVOKE_URL = 'https://open.tiktokapis.com/v2/oauth/revoke/';

export interface StoredTikTokCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
  tokenType: string;
  externalUserId?: string;
  /** TikTok refresh tokens also expire; track when known. */
  refreshExpiresAt?: string | null;
}

interface TikTokRefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string;
  token_type?: string;
  open_id?: string;
}

@Injectable()
export class TikTokTokenService {
  private readonly logger = new Logger(TikTokTokenService.name);

  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
  ) {}

  async getAccessToken(businessId: string): Promise<string> {
    const credentials = await this.getStoredCredentials(businessId);
    return credentials.accessToken;
  }

  async getStoredCredentials(
    businessId: string,
  ): Promise<StoredTikTokCredentials> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'tiktok',
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        'TikTok integration is not connected',
        HttpStatus.BAD_REQUEST,
      );
    }

    const encrypted = (
      integration.credentials as { encrypted?: string } | null
    )?.encrypted;
    if (!encrypted) {
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        'TikTok integration has no stored credentials',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stored = decryptIntegrationCredentials(
      this.getEncryptionKey(),
      encrypted,
    ) as unknown as StoredTikTokCredentials;

    if (!this.isAccessTokenExpired(stored.expiresAt)) {
      return stored;
    }

    if (!stored.refreshToken) {
      await this.markExpired(businessId, 'Access token expired with no refresh token');
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        'TikTok access token expired. Please reconnect.',
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
        'TikTok refresh token expired. Please reconnect.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const refreshed = await this.refreshAccessToken(stored.refreshToken);
      const updated: StoredTikTokCredentials = {
        ...stored,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? stored.refreshToken,
        expiresAt: new Date(
          Date.now() + refreshed.expires_in * 1000,
        ).toISOString(),
        refreshExpiresAt:
          refreshed.refresh_expires_in !== undefined
            ? new Date(
                Date.now() + refreshed.refresh_expires_in * 1000,
              ).toISOString()
            : (stored.refreshExpiresAt ?? null),
        scope: refreshed.scope ?? stored.scope,
        tokenType: refreshed.token_type ?? stored.tokenType,
        externalUserId: refreshed.open_id ?? stored.externalUserId,
      };
      await this.persistCredentials(businessId, updated);
      this.logger.log(`Refreshed TikTok access token for business=${businessId}`);
      return updated;
    } catch (error) {
      this.logger.warn(
        `TikTok token refresh failed for business=${businessId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.markExpired(
        businessId,
        'Failed to refresh TikTok access token. Please reconnect.',
      );
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        'TikTok access token expired. Please reconnect.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Best-effort revoke on disconnect so TikTok drops the prior grant
   * and reconnect is less likely to silently reuse the same account.
   */
  async revokeOnDisconnect(businessId: string): Promise<void> {
    try {
      const integration =
        await this.businessIntegrationRepository.findByBusinessAndKey(
          businessId,
          'tiktok',
        );
      const encrypted = (
        integration?.credentials as { encrypted?: string } | null
      )?.encrypted;
      if (!encrypted) return;

      const stored = decryptIntegrationCredentials(
        this.getEncryptionKey(),
        encrypted,
      ) as unknown as StoredTikTokCredentials;
      if (!stored.accessToken) return;

      const clientKey = process.env.TIKTOK_OAUTH_CLIENT_KEY?.trim();
      const clientSecret = process.env.TIKTOK_OAUTH_CLIENT_SECRET?.trim();
      if (!clientKey || !clientSecret) return;

      const response = await fetch(TIKTOK_OAUTH_REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          token: stored.accessToken,
        }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.warn(
          `TikTok revoke failed for business=${businessId}: ${response.status} ${body}`,
        );
        return;
      }
      this.logger.log(`Revoked TikTok token for business=${businessId}`);
    } catch (error) {
      this.logger.warn(
        `TikTok revoke skipped for business=${businessId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private isAccessTokenExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return Date.now() >= new Date(expiresAt).getTime() - 60_000;
  }

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<TikTokRefreshResponse> {
    const clientKey = process.env.TIKTOK_OAUTH_CLIENT_KEY?.trim();
    const clientSecret = process.env.TIKTOK_OAUTH_CLIENT_SECRET?.trim();
    if (!clientKey || !clientSecret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'TikTok OAuth is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const response = await fetch(TIKTOK_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const json = (await response.json()) as TikTokRefreshResponse & {
      error?: string;
      error_description?: string;
      data?: TikTokRefreshResponse;
    };
    const data = json.data ?? json;
    if (!response.ok || !data.access_token) {
      throw new Error(
        json.error_description ||
          json.error ||
          `TikTok token refresh failed (${response.status})`,
      );
    }
    return data;
  }

  private async persistCredentials(
    businessId: string,
    credentials: StoredTikTokCredentials,
  ): Promise<void> {
    const encrypted = encryptIntegrationCredentials(
      this.getEncryptionKey(),
      credentials as unknown as Record<string, unknown>,
    );
    await this.businessIntegrationRepository.update(businessId, 'tiktok', {
      credentials: { encrypted } as Prisma.InputJsonValue,
      status: IntegrationStatus.CONNECTED,
      errorMessage: null,
    });
  }

  private async markExpired(
    businessId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.businessIntegrationRepository.update(businessId, 'tiktok', {
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
