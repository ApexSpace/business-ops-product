import * as Joi from 'joi';
import { resolveDatabaseUrl } from './database-url.util';

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
  API_PREFIX: Joi.string().required(),
  CORS_ORIGIN: Joi.string().default('*'),
  ENABLE_RESPONSE_ENVELOPE: Joi.string().valid('true', 'false').default('true'),
  FRONTEND_URL: Joi.string().uri().optional(),
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
  /** Facebook Login for Business — used for Facebook & Instagram connect */
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

  const googleEnabled = (env as NodeJS.ProcessEnv).GOOGLE_OAUTH_ENABLED === 'true';
  const metaEnabled = (env as NodeJS.ProcessEnv).META_OAUTH_ENABLED === 'true';
  const linkedInEnabled =
    (env as NodeJS.ProcessEnv).LINKEDIN_OAUTH_ENABLED === 'true';
  const encryptionKey = (env as NodeJS.ProcessEnv).INTEGRATION_ENCRYPTION_KEY;

  if ((googleEnabled || metaEnabled || linkedInEnabled) && !encryptionKey) {
    return helpers.error('any.custom', {
      message:
        'INTEGRATION_ENCRYPTION_KEY is required when OAuth integrations are enabled (Google, Meta, or LinkedIn).',
    });
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
