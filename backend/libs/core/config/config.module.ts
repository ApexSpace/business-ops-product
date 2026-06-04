import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { validateEnv } from './env.validation';
import { resolveDatabaseUrl } from './database-url.util';
import { resolveRedisUrl } from '../redis/redis-url.util';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [configuration],
      validate: (config) => {
        const validated = validateEnv(config);
        const env = validated as NodeJS.ProcessEnv;
        process.env.DATABASE_URL = resolveDatabaseUrl(env);
        const redisUrl = resolveRedisUrl(env);
        if (redisUrl) {
          process.env.REDIS_URL = redisUrl;
        }
        return validated;
      },
    }),
  ],
})
export class AppConfigModule {}
