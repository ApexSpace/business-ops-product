import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RootConfig } from '@app/core/config/configuration';
import {
  encryptIntegrationCredentials,
  decryptIntegrationCredentials,
} from '@app/common/utils/integration-encryption.util';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';

export interface StoredTwilioCredentials {
  accountSid: string;
  authToken: string;
}

@Injectable()
export class TwilioCredentialsService {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  private getEncryptionSecret(): string {
    const secret = this.configService.get('integrations.encryptionKey', {
      infer: true,
    });
    if (!secret?.trim()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Integration encryption key is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }
    return secret;
  }

  encrypt(credentials: StoredTwilioCredentials): { encrypted: string } {
    return {
      encrypted: encryptIntegrationCredentials(
        this.getEncryptionSecret(),
        credentials as unknown as Record<string, unknown>,
      ),
    };
  }

  decrypt(credentials: unknown): StoredTwilioCredentials {
    if (!credentials || typeof credentials !== 'object') {
      throw new AppException(
        ErrorCode.INTEGRATION_NOT_FOUND,
        'Twilio credentials are missing',
        HttpStatus.BAD_REQUEST,
      );
    }
    const encrypted = (credentials as { encrypted?: string }).encrypted;
    if (!encrypted) {
      throw new AppException(
        ErrorCode.INTEGRATION_NOT_FOUND,
        'Twilio credentials are missing',
        HttpStatus.BAD_REQUEST,
      );
    }
    const payload = decryptIntegrationCredentials(
      this.getEncryptionSecret(),
      encrypted,
    );
    const accountSid =
      typeof payload.accountSid === 'string' ? payload.accountSid : '';
    const authToken =
      typeof payload.authToken === 'string' ? payload.authToken : '';
    if (!accountSid || !authToken) {
      throw new AppException(
        ErrorCode.INTEGRATION_NOT_FOUND,
        'Twilio credentials are invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return { accountSid, authToken };
  }
}
