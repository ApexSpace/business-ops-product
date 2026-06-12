import * as Joi from 'joi';
import { resolveDatabaseUrl } from './database-url.util';
import { emailEnvValidationSchema } from './email/email-env.validation';

const baseSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().optional(),
  DB_HOST: Joi.string().optional(),
  DB_PORT: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  DB_USERNAME: Joi.string().optional(),
  DB_PASSWORD: Joi.string().optional(),
  DB_DATABASE: Joi.string().optional(),
  DB_POOL_MAX: Joi.number().integer().min(1).max(100).optional(),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  API_PREFIX: Joi.string().required(),
  CORS_ORIGIN: Joi.string().default('*'),
  REALTIME_WEBSOCKET_ENABLED: Joi.string().valid('true', 'false').default('false'),
  REALTIME_CORS_ORIGIN: Joi.string().optional(),
  ENABLE_RESPONSE_ENVELOPE: Joi.string().valid('true', 'false').default('true'),
  FRONTEND_URL: Joi.string().uri().optional(),
  /** Public API origin for widgets and embed scripts (no trailing slash). */
  BACKEND_PUBLIC_URL: Joi.string().uri().optional(),
  /** Host segment when BACKEND_PUBLIC_URL is unset (default localhost). */
  BACKEND_PUBLIC_HOST: Joi.string().optional(),
  /** @deprecated Use FRONTEND_URL instead. Kept for backward compatibility. */
  APP_BASE_URL: Joi.string().uri().optional(),
  JWT_ACCESS_SECRET: Joi.when('NODE_ENV', {
    is: 'test',
    then: Joi.string().min(16).default('test-access-secret-min-16'),
    otherwise: Joi.string().min(16).required(),
  }),
  JWT_REFRESH_SECRET: Joi.when('NODE_ENV', {
    is: 'test',
    then: Joi.string().min(16).default('test-refresh-secret-min-16'),
    otherwise: Joi.string().min(16).required(),
  }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  SEED_SUPER_ADMIN_EMAIL: Joi.string().email().optional(),
  SEED_SUPER_ADMIN_PASSWORD: Joi.string().min(8).optional(),
  GOOGLE_OAUTH_ENABLED: Joi.string().valid('true', 'false').default('false'),
  GOOGLE_CLIENT_ID: Joi.when('GOOGLE_OAUTH_ENABLED', {
    is: 'true',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  GOOGLE_CLIENT_SECRET: Joi.when('GOOGLE_OAUTH_ENABLED', {
    is: 'true',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  GOOGLE_OAUTH_REDIRECT_URI: Joi.when('GOOGLE_OAUTH_ENABLED', {
    is: 'true',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional(),
  }),
  INTEGRATION_ENCRYPTION_KEY: Joi.string().min(32).optional(),
  META_OAUTH_ENABLED: Joi.string().valid('true', 'false').default('false'),
  META_APP_ID: Joi.when('META_OAUTH_ENABLED', {
    is: 'true',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  META_APP_SECRET: Joi.when('META_OAUTH_ENABLED', {
    is: 'true',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  META_REDIRECT_URI: Joi.when('META_OAUTH_ENABLED', {
    is: 'true',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional(),
  }),
  META_WEBHOOK_VERIFY_TOKEN: Joi.string().optional(),
  META_GRAPH_API_VERSION: Joi.string().default('v20.0'),
  /** Facebook Login for Business — Facebook connect (Page-oriented variation) */
  META_FACEBOOK_LOGIN_CONFIG_ID: Joi.string().optional(),
  /** Instagram Graph API Login for Business — Instagram connect */
  META_INSTAGRAM_LOGIN_CONFIG_ID: Joi.string().optional(),
  /** @deprecated Fallback when META_FACEBOOK_LOGIN_CONFIG_ID / META_INSTAGRAM_LOGIN_CONFIG_ID unset */
  META_LOGIN_CONFIG_ID: Joi.string().optional(),
  /** WhatsApp Embedded Signup only — do not use for Facebook/Instagram */
  META_EMBEDDED_SIGNUP_CONFIG_ID: Joi.string().optional(),

  LINKEDIN_OAUTH_ENABLED: Joi.string().valid('true', 'false').default('false'),
  LINKEDIN_CLIENT_ID: Joi.when('LINKEDIN_OAUTH_ENABLED', {
    is: 'true',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  LINKEDIN_CLIENT_SECRET: Joi.when('LINKEDIN_OAUTH_ENABLED', {
    is: 'true',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  LINKEDIN_REDIRECT_URI: Joi.when('LINKEDIN_OAUTH_ENABLED', {
    is: 'true',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional(),
  }),
  LINKEDIN_API_VERSION: Joi.string().default('202506'),

  STRIPE_CONNECT_ENABLED: Joi.string().valid('true', 'false').default('false'),
  STRIPE_SECRET_KEY: Joi.when('STRIPE_CONNECT_ENABLED', {
    is: 'true',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  STRIPE_CLIENT_ID: Joi.when('STRIPE_CONNECT_ENABLED', {
    is: 'true',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  STRIPE_REDIRECT_URI: Joi.when('STRIPE_CONNECT_ENABLED', {
    is: 'true',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional(),
  }),
  STRIPE_WEBHOOK_SECRET_PLATFORM: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNT: Joi.string().optional(),
  STRIPE_API_VERSION: Joi.string().default('2025-05-28.basil'),

  /**
   * When false in production, Redis is optional (not recommended).
   * Default true: production requires REDIS_URL for queues, idempotency, and SSE.
   */
  REQUIRE_REDIS: Joi.string().valid('true', 'false').default('true'),
  /** Queues, SSE pub-sub, idempotency. Use once in .env — duplicate keys keep the last value. */
  REDIS_URL: Joi.string()
    .pattern(/^rediss?:\/\//)
    .optional(),
  /** Enable TLS when using redis:// but the server requires TLS (prefer rediss://). */
  REDIS_TLS: Joi.string().valid('true', 'false').optional(),
  /** Password when not embedded in REDIS_URL (e.g. ACL user default). */
  REDIS_PASSWORD: Joi.string().optional(),

  ...emailEnvValidationSchema,
});

export const envValidationSchema = baseSchema.custom((env, helpers) => {
  const databaseUrl = resolveDatabaseUrl(env as NodeJS.ProcessEnv);
  const { error } = Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .validate(databaseUrl);

  if (error || !databaseUrl) {
    return helpers.error('any.custom', {
      message:
        'DATABASE_URL must be a valid PostgreSQL URI, or set DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, and DB_DATABASE',
    });
  }

  const nodeEnv = (env as NodeJS.ProcessEnv).NODE_ENV ?? 'development';
  const frontendUrl = (env as NodeJS.ProcessEnv).FRONTEND_URL?.trim();
  const legacyBaseUrl = (env as NodeJS.ProcessEnv).APP_BASE_URL?.trim();

  if (nodeEnv !== 'test' && !frontendUrl && !legacyBaseUrl) {
    return helpers.error('any.custom', {
      message:
        'FRONTEND_URL is required. APP_BASE_URL is deprecated — set FRONTEND_URL to your Next.js origin (e.g. http://localhost:3001).',
    });
  }

  const googleEnabled =
    (env as NodeJS.ProcessEnv).GOOGLE_OAUTH_ENABLED === 'true';
  const metaEnabled = (env as NodeJS.ProcessEnv).META_OAUTH_ENABLED === 'true';
  const linkedInEnabled =
    (env as NodeJS.ProcessEnv).LINKEDIN_OAUTH_ENABLED === 'true';
  const stripeEnabled =
    (env as NodeJS.ProcessEnv).STRIPE_CONNECT_ENABLED === 'true';
  const encryptionKey = (env as NodeJS.ProcessEnv).INTEGRATION_ENCRYPTION_KEY;

  if (
    (googleEnabled || metaEnabled || linkedInEnabled || stripeEnabled) &&
    !encryptionKey
  ) {
    return helpers.error('any.custom', {
      message:
        'INTEGRATION_ENCRYPTION_KEY is required when OAuth integrations are enabled (Google, Meta, LinkedIn, or Stripe).',
    });
  }

  const requireRedis =
    nodeEnv === 'production' &&
    ((env as NodeJS.ProcessEnv).REQUIRE_REDIS ?? 'true').toLowerCase() !==
      'false';

  if (requireRedis && !(env as NodeJS.ProcessEnv).REDIS_URL?.trim()) {
    return helpers.error('any.custom', {
      message:
        'REDIS_URL is required in production when REQUIRE_REDIS=true (queues, webhooks, idempotency, SSE).',
    });
  }

  if (metaEnabled) {
    const metaEnv = env as NodeJS.ProcessEnv;
    const facebookLoginId =
      metaEnv.META_FACEBOOK_LOGIN_CONFIG_ID?.trim() ||
      metaEnv.META_LOGIN_CONFIG_ID?.trim();
    const instagramLoginId =
      metaEnv.META_INSTAGRAM_LOGIN_CONFIG_ID?.trim() ||
      metaEnv.META_LOGIN_CONFIG_ID?.trim();

    if (!facebookLoginId) {
      return helpers.error('any.custom', {
        message:
          'When META_OAUTH_ENABLED=true, set META_FACEBOOK_LOGIN_CONFIG_ID or META_LOGIN_CONFIG_ID for Facebook connect.',
      });
    }

    if (!instagramLoginId) {
      return helpers.error('any.custom', {
        message:
          'When META_OAUTH_ENABLED=true, set META_INSTAGRAM_LOGIN_CONFIG_ID or META_LOGIN_CONFIG_ID for Instagram connect.',
      });
    }
  }

  return { ...env, DATABASE_URL: databaseUrl } as Record<string, unknown>;
});

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = envValidationSchema.validate(config, {
    abortEarly: true,
    allowUnknown: true,
  });

  if (result.error) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }

  return result.value as Record<string, unknown>;
}
