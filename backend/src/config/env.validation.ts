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
  APP_BASE_URL: Joi.string().uri().default('http://localhost:3000'),
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
