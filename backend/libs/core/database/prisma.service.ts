import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { RootConfig } from '@app/core/config/configuration';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor(configService: ConfigService<RootConfig, true>) {
    const databaseUrl = configService.get('database.url', { infer: true });
    const poolMax = configService.get('database.poolMax', { infer: true });

    const pool = new Pool({
      connectionString: databaseUrl,
      max: poolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    const adapter = new PrismaPg(pool, { disposeExternalPool: true });

    const logQueries =
      (process.env.LOG_LEVEL ?? 'info').toLowerCase() === 'debug';

    super({
      adapter,
      log: logQueries ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log(
      `Database connection established (pool max=${this.pool.options.max})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
