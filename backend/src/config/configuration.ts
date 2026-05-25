import { resolveDatabaseUrl } from './database-url.util';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  enableResponseEnvelope: boolean;
  baseUrl: string;
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

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  auth: AuthConfig;
  seed: SeedConfig;
}

export default (): RootConfig => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    enableResponseEnvelope:
      (process.env.ENABLE_RESPONSE_ENVELOPE ?? 'true').toLowerCase() === 'true',
    baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
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
});
