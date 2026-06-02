import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../../common/exceptions/error-code.enum';
import { RootConfig } from '../../../../config/configuration';
import {
  isMetaBusinessOAuthProviderKey,
  META_CONFIG_IDS_MUST_DIFFER_MESSAGE,
  META_LOGIN_NOT_CONFIGURED_MESSAGE,
  META_WRONG_CONFIG_FOR_OAUTH_MESSAGE,
  WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE,
  type MetaProviderKey,
} from '../constants/meta-provider.config';

export const META_ENV_NOT_CONFIGURED_MESSAGE =
  'Meta integration is not configured. Please set META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI in backend environment.';

export interface MetaAppConfig {
  appId: string;
  appSecret: string;
  webhookVerifyToken: string | null;
  /** Facebook Login for Business — Facebook & Instagram OAuth */
  loginConfigId: string | null;
  /** WhatsApp Embedded Signup only */
  embeddedSignupConfigId: string | null;
  graphApiVersion: string;
}

@Injectable()
export class MetaConfigService {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  getMetaAppConfig(): MetaAppConfig {
    const appId = process.env.META_APP_ID?.trim();
    const appSecret = process.env.META_APP_SECRET?.trim();
    const redirectUri = process.env.META_REDIRECT_URI?.trim();

    if (!appId || !appSecret || !redirectUri) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        META_ENV_NOT_CONFIGURED_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      appId,
      appSecret,
      webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() ?? null,
      loginConfigId: process.env.META_LOGIN_CONFIG_ID?.trim() ?? null,
      embeddedSignupConfigId:
        process.env.META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() ?? null,
      graphApiVersion: process.env.META_GRAPH_API_VERSION?.trim() ?? 'v20.0',
    };
  }

  /**
   * OAuth redirect URI used in Meta authorize + token exchange.
   * Defaults to META_REDIRECT_URI for all Meta providers (register this URL in the Meta app).
   * Set META_WHATSAPP_REDIRECT_URI only when WhatsApp embedded signup uses a separate callback URL.
   */
  getMetaRedirectUri(providerKey?: MetaProviderKey | string): string {
    if (providerKey === 'whatsapp') {
      const whatsappUri = process.env.META_WHATSAPP_REDIRECT_URI?.trim();
      if (whatsappUri) {
        return whatsappUri;
      }
    }

    const redirectUri = process.env.META_REDIRECT_URI?.trim();
    if (!redirectUri) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        META_ENV_NOT_CONFIGURED_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    return redirectUri;
  }

  getLoginConfigId(): string | null {
    return this.getMetaAppConfig().loginConfigId;
  }

  hasLoginConfig(): boolean {
    return Boolean(this.getLoginConfigId());
  }

  getEmbeddedSignupConfigId(): string | null {
    return this.getMetaAppConfig().embeddedSignupConfigId;
  }

  hasEmbeddedSignupConfig(): boolean {
    return Boolean(this.getEmbeddedSignupConfigId());
  }

  /** Facebook / Instagram — must use Login for Business config ID only. */
  assertLoginConfigForOAuth(providerKey: string): string {
    const normalized = String(providerKey).trim();
    if (!isMetaBusinessOAuthProviderKey(normalized)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        META_WRONG_CONFIG_FOR_OAUTH_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    const loginId = this.getLoginConfigId();
    const embeddedId = this.getEmbeddedSignupConfigId();

    if (!loginId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        META_LOGIN_NOT_CONFIGURED_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (embeddedId && loginId === embeddedId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        META_CONFIG_IDS_MUST_DIFFER_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    return loginId;
  }

  /** WhatsApp Embedded Signup — must use embedded signup config ID only. */
  assertEmbeddedSignupConfigForWhatsApp(): string {
    const loginId = this.getLoginConfigId();
    const embeddedId = this.getEmbeddedSignupConfigId();

    if (!embeddedId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (loginId && loginId === embeddedId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        META_CONFIG_IDS_MUST_DIFFER_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    return embeddedId;
  }

  getClientConfigForFrontend(): {
    appId: string;
    graphApiVersion: string;
    whatsappEmbeddedSignupConfigId: string | null;
    whatsappEmbeddedSignupReady: boolean;
  } {
    const { appId, graphApiVersion, embeddedSignupConfigId } =
      this.getMetaAppConfig();
    const ready = Boolean(
      embeddedSignupConfigId &&
        (!this.getLoginConfigId() ||
          embeddedSignupConfigId !== this.getLoginConfigId()),
    );
    return {
      appId,
      graphApiVersion,
      whatsappEmbeddedSignupConfigId: embeddedSignupConfigId,
      whatsappEmbeddedSignupReady: ready,
    };
  }

  getEncryptionKey(): string {
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

  getStateSecret(): string {
    return (
      process.env.INTEGRATION_ENCRYPTION_KEY ??
      this.configService.get('jwt.accessSecret', { infer: true })
    );
  }

  isMetaOAuthEnabled(): boolean {
    return (
      (process.env.META_OAUTH_ENABLED ?? 'false').toLowerCase() === 'true'
    );
  }
}
