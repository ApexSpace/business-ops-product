import { resolveDatabaseUrl } from './database-url.util';

/** Resolves the public frontend origin for OAuth redirects and invite links. */
export function resolveFrontendUrl(env: NodeJS.ProcessEnv): string {
  return (
    env.FRONTEND_URL?.trim() ||
    env.APP_BASE_URL?.trim() ||
    'http://localhost:3001'
  ).replace(/\/$/, '');
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  enableResponseEnvelope: boolean;
  envelopeLegacyFields: boolean;
  /** Next.js / browser-facing app origin (OAuth redirects, invite links). */
  frontendUrl: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface AuthConfig {
  bcryptRounds: number;
}

export interface SeedConfig {
  superAdminEmail: string;
  superAdminPassword: string;
}

export interface IntegrationConfig {
  googleOAuthEnabled: boolean;
  googleClientId?: string;
  googleRedirectUri?: string;
  encryptionKey?: string;
}

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  auth: AuthConfig;
  seed: SeedConfig;
  integrations: IntegrationConfig;
}

export default (): RootConfig => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    enableResponseEnvelope:
      (process.env.ENABLE_RESPONSE_ENVELOPE ?? 'true').toLowerCase() === 'true',
    envelopeLegacyFields:
      (process.env.ENVELOPE_LEGACY_FIELDS ?? 'true').toLowerCase() === 'true',
    frontendUrl: resolveFrontendUrl(process.env),
  },
  database: {
    url: resolveDatabaseUrl(process.env),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  auth: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  },
  seed: {
    superAdminEmail:
      process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@example.com',
    superAdminPassword:
      process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!',
  },
  integrations: {
    googleOAuthEnabled:
      (process.env.GOOGLE_OAUTH_ENABLED ?? 'false').toLowerCase() === 'true',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY,
  },
});
