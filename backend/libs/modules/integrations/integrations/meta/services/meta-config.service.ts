import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { RootConfig } from '@app/core/config/configuration';
import {
  isMetaBusinessOAuthProviderKey,
  META_CONFIG_IDS_MUST_DIFFER_MESSAGE,
  META_FACEBOOK_INSTAGRAM_SAME_CONFIG_WARNING,
  META_FACEBOOK_LOGIN_NOT_CONFIGURED_MESSAGE,
  META_INSTAGRAM_LOGIN_CONFIG_SETUP_HINT,
  META_INSTAGRAM_LOGIN_NOT_CONFIGURED_MESSAGE,
  META_OAUTH_CONFIG_MATCHES_WHATSAPP_MESSAGE,
  META_WRONG_CONFIG_FOR_OAUTH_MESSAGE,
  WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE,
  type MetaBusinessOAuthProviderKey,
  type MetaProviderKey,
} from '../constants/meta-provider.config';

export const META_ENV_NOT_CONFIGURED_MESSAGE =
  'Meta integration is not configured. Please set META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI in backend environment.';

export type MetaOAuthLoginConfigSource =
  | 'META_FACEBOOK_LOGIN_CONFIG_ID'
  | 'META_INSTAGRAM_LOGIN_CONFIG_ID'
  | 'META_LOGIN_CONFIG_ID';

export interface MetaOAuthLoginConfigResolution {
  configId: string;
  source: MetaOAuthLoginConfigSource;
}

export interface MetaAppConfig {
  appId: string;
  appSecret: string;
  webhookVerifyToken: string | null;
  /** @deprecated Fallback when provider-specific Login config IDs are unset */
  loginConfigId: string | null;
  facebookLoginConfigId: string | null;
  instagramLoginConfigId: string | null;
  /** WhatsApp Embedded Signup only */
  embeddedSignupConfigId: string | null;
  graphApiVersion: string;
}

@Injectable()
export class MetaConfigService {
  private readonly logger = new Logger(MetaConfigService.name);
  private sameConfigWarningLogged = false;
  private instagramSetupHintLogged = false;

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
      facebookLoginConfigId:
        process.env.META_FACEBOOK_LOGIN_CONFIG_ID?.trim() ?? null,
      instagramLoginConfigId:
        process.env.META_INSTAGRAM_LOGIN_CONFIG_ID?.trim() ?? null,
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

  getFacebookLoginConfigId(): string | null {
    return this.getMetaAppConfig().facebookLoginConfigId;
  }

  getInstagramLoginConfigId(): string | null {
    return this.getMetaAppConfig().instagramLoginConfigId;
  }

  hasLoginConfig(): boolean {
    const config = this.getMetaAppConfig();
    return Boolean(
      config.loginConfigId ||
        config.facebookLoginConfigId ||
        config.instagramLoginConfigId,
    );
  }

  getEmbeddedSignupConfigId(): string | null {
    return this.getMetaAppConfig().embeddedSignupConfigId;
  }

  hasEmbeddedSignupConfig(): boolean {
    return Boolean(this.getEmbeddedSignupConfigId());
  }

  /** Facebook / Instagram — Login for Business config ID (provider-specific with fallback). */
  assertLoginConfigForOAuth(
    providerKey: string,
  ): MetaOAuthLoginConfigResolution {
    const normalized = String(providerKey).trim();
    if (!isMetaBusinessOAuthProviderKey(normalized)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        META_WRONG_CONFIG_FOR_OAUTH_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    const resolution = this.resolveOAuthLoginConfig(
      normalized as MetaBusinessOAuthProviderKey,
    );

    if (!resolution) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        normalized === 'facebook'
          ? META_FACEBOOK_LOGIN_NOT_CONFIGURED_MESSAGE
          : META_INSTAGRAM_LOGIN_NOT_CONFIGURED_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    this.assertOAuthConfigNotWhatsAppEmbedded(resolution.configId);

    this.warnIfFacebookAndInstagramShareConfigId();

    return resolution;
  }

  private resolveOAuthLoginConfig(
    providerKey: MetaBusinessOAuthProviderKey,
  ): MetaOAuthLoginConfigResolution | null {
    const fallback = this.getLoginConfigId();

    if (providerKey === 'facebook') {
      const specific = this.getFacebookLoginConfigId();
      if (specific) {
        return {
          configId: specific,
          source: 'META_FACEBOOK_LOGIN_CONFIG_ID',
        };
      }
      if (fallback) {
        return { configId: fallback, source: 'META_LOGIN_CONFIG_ID' };
      }
      return null;
    }

    const specific = this.getInstagramLoginConfigId();
    if (specific) {
      return {
        configId: specific,
        source: 'META_INSTAGRAM_LOGIN_CONFIG_ID',
      };
    }
    if (fallback) {
      return { configId: fallback, source: 'META_LOGIN_CONFIG_ID' };
    }
    return null;
  }

  private assertOAuthConfigNotWhatsAppEmbedded(configId: string): void {
    const embeddedId = this.getEmbeddedSignupConfigId();
    if (embeddedId && configId === embeddedId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        META_OAUTH_CONFIG_MATCHES_WHATSAPP_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private warnIfFacebookAndInstagramShareConfigId(): void {
    if (this.sameConfigWarningLogged) {
      return;
    }

    const facebook = this.resolveOAuthLoginConfig('facebook');
    const instagram = this.resolveOAuthLoginConfig('instagram');

    if (
      facebook &&
      instagram &&
      facebook.configId === instagram.configId
    ) {
      this.sameConfigWarningLogged = true;
      this.logger.warn(META_FACEBOOK_INSTAGRAM_SAME_CONFIG_WARNING);
    }
  }

  /** WhatsApp Embedded Signup — must use embedded signup config ID only. */
  assertEmbeddedSignupConfigForWhatsApp(): string {
    const embeddedId = this.getEmbeddedSignupConfigId();

    if (!embeddedId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    const facebookId =
      this.resolveOAuthLoginConfig('facebook')?.configId ?? null;
    const instagramId =
      this.resolveOAuthLoginConfig('instagram')?.configId ?? null;

    if (embeddedId === facebookId || embeddedId === instagramId) {
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
    const facebookId =
      this.resolveOAuthLoginConfig('facebook')?.configId ?? null;
    const instagramId =
      this.resolveOAuthLoginConfig('instagram')?.configId ?? null;
    const loginIds = [facebookId, instagramId].filter(Boolean) as string[];

    const ready = Boolean(
      embeddedSignupConfigId &&
        loginIds.every((id) => id !== embeddedSignupConfigId),
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

  /** Log once — wrong META_INSTAGRAM_LOGIN_CONFIG_ID causes Instagram direct login instead of Facebook OAuth. */
  logInstagramFacebookLoginSetupHint(): void {
    if (this.instagramSetupHintLogged) {
      return;
    }
    this.instagramSetupHintLogged = true;
    this.logger.log(META_INSTAGRAM_LOGIN_CONFIG_SETUP_HINT);
  }
}
