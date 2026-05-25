import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import { defineConfig } from 'prisma/config';
import { resolveDatabaseUrl } from './src/config/database-url.util';

const loaded = dotenv.config();
expand(loaded);
process.env.DATABASE_URL = resolveDatabaseUrl(process.env);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed:
      'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
