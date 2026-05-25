import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { validateEnv } from './env.validation';
import { resolveDatabaseUrl } from './database-url.util';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [configuration],
      validate: (config) => {
        const validated = validateEnv(config);
        process.env.DATABASE_URL = resolveDatabaseUrl(
          validated as NodeJS.ProcessEnv,
        );
        return validated;
      },
    }),
  ],
})
export class AppConfigModule {}
