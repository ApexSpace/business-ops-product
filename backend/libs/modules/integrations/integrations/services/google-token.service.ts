import { HttpStatus, Injectable } from '@nestjs/common';
import { IntegrationStatus, Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from '@app/common/utils/integration-encryption.util';
import { GOOGLE_OAUTH_TOKEN_URL } from '../constants/google-oauth.constants';
import { BusinessIntegrationRepository } from '../repositories/business-integration.repository';

interface StoredGoogleCredentials {
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
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
  ) {}

  async getAccessToken(
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

    if (this.isTokenExpired(stored.expiresAt)) {
      if (!stored.refreshToken) {
        await this.markExpired(businessId, providerKey);
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Google access token expired and no refresh token is available',
          HttpStatus.BAD_REQUEST,
        );
      }

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
      return updatedCredentials.accessToken;
    }

    return stored.accessToken;
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
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to refresh Google access token',
        HttpStatus.BAD_REQUEST,
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
    });
  }

  private async markExpired(
    businessId: string,
    providerKey: string,
  ): Promise<void> {
    await this.businessIntegrationRepository.update(businessId, providerKey, {
      status: IntegrationStatus.EXPIRED,
      errorMessage: 'Google access token expired. Please reconnect.',
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
