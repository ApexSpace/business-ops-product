import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { IntegrationStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from '@app/common/utils/integration-encryption.util';
import {
  GOOGLE_OAUTH_TOKEN_URL,
  isGoogleOAuthProviderKey,
} from '../constants/google-oauth.constants';
import { BusinessIntegrationRepository } from '../repositories/business-integration.repository';

const GOOGLE_OAUTH_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export interface StoredGoogleCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  scope: string;
  tokenType: string;
}

interface GoogleRefreshResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

@Injectable()
export class GoogleTokenService {
  private readonly logger = new Logger(GoogleTokenService.name);

  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
  ) {}

  async getAccessToken(
    businessId: string,
    providerKey: string,
  ): Promise<string> {
    const credentials = await this.getStoredCredentials(businessId, providerKey);
    return credentials.accessToken;
  }

  /**
   * Returns decrypted credentials with a non-expired access token
   * (refreshing when needed). Includes granted OAuth `scope` for validation.
   */
  async getStoredCredentials(
    businessId: string,
    providerKey: string,
  ): Promise<StoredGoogleCredentials> {
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

    const stored = decryptIntegrationCredentials(
      this.getEncryptionKey(),
      credentials.encrypted,
    ) as unknown as StoredGoogleCredentials;

    // Fall back to config.scopes when encrypted payload omitted scope.
    const config = integration.config as {
      scopes?: unknown;
    } | null;
    if (!stored.scope?.trim() && Array.isArray(config?.scopes)) {
      stored.scope = config.scopes
        .filter((s): s is string => typeof s === 'string')
        .join(' ');
    }

    if (this.isTokenExpired(stored.expiresAt)) {
      if (!stored.refreshToken) {
        await this.markExpired(
          businessId,
          providerKey,
          'Google access token expired and no refresh token is available',
        );
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Google access token expired and no refresh token is available',
          HttpStatus.BAD_REQUEST,
        );
      }

      try {
        const refreshed = await this.refreshAccessToken(stored.refreshToken);
        const updatedCredentials: StoredGoogleCredentials = {
          ...stored,
          accessToken: refreshed.access_token,
          expiresAt: new Date(
            Date.now() + refreshed.expires_in * 1000,
          ).toISOString(),
          scope: refreshed.scope ?? stored.scope,
          tokenType: refreshed.token_type ?? stored.tokenType,
        };

        await this.persistCredentials(
          businessId,
          providerKey,
          updatedCredentials,
        );
        return updatedCredentials;
      } catch (error) {
        this.logger.warn(
          `Google token refresh failed for ${providerKey} business=${businessId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await this.markExpired(
          businessId,
          providerKey,
          'Failed to refresh Google access token. Please reconnect.',
        );
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Google access token expired. Please reconnect.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return stored;
  }

  /**
   * Best-effort revoke on disconnect so Google drops the prior grant.
   */
  async revokeOnDisconnect(
    businessId: string,
    providerKey: string,
  ): Promise<void> {
    if (!isGoogleOAuthProviderKey(providerKey)) return;

    try {
      const integration =
        await this.businessIntegrationRepository.findByBusinessAndKey(
          businessId,
          providerKey,
        );
      const encrypted = (
        integration?.credentials as { encrypted?: string } | null
      )?.encrypted;
      if (!encrypted) return;

      const stored = decryptIntegrationCredentials(
        this.getEncryptionKey(),
        encrypted,
      ) as unknown as StoredGoogleCredentials;
      const token = stored.accessToken || stored.refreshToken;
      if (!token) return;

      const response = await fetch(GOOGLE_OAUTH_REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.warn(
          `Google revoke failed for ${providerKey} business=${businessId}: ${response.status} ${body}`,
        );
        return;
      }
      this.logger.log(
        `Revoked Google token for ${providerKey} business=${businessId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Google revoke skipped for ${providerKey} business=${businessId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private isTokenExpired(expiresAt: string): boolean {
    const expiry = new Date(expiresAt).getTime();
    return Date.now() >= expiry - 60_000;
  }

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<GoogleRefreshResponse> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Google OAuth is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Failed to refresh Google access token (${response.status}): ${detail}`,
      );
    }

    return (await response.json()) as GoogleRefreshResponse;
  }

  private async persistCredentials(
    businessId: string,
    providerKey: string,
    credentials: StoredGoogleCredentials,
  ): Promise<void> {
    const encrypted = encryptIntegrationCredentials(
      this.getEncryptionKey(),
      credentials as unknown as Record<string, unknown>,
    );

    await this.businessIntegrationRepository.update(businessId, providerKey, {
      credentials: { encrypted },
      status: IntegrationStatus.CONNECTED,
      errorMessage: null,
    });
  }

  private async markExpired(
    businessId: string,
    providerKey: string,
    errorMessage: string,
  ): Promise<void> {
    await this.businessIntegrationRepository.update(businessId, providerKey, {
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
