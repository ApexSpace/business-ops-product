import { defineConfig } from 'prisma/config';

/** Load .env when present (local). Dokploy/Docker inject env vars directly. */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv') as typeof import('dotenv');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { expand } = require('dotenv-expand') as typeof import('dotenv-expand');
  expand(dotenv.config());
} catch {
  // dotenv is optional in production containers
}

function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.DATABASE_URL?.trim();
  if (raw && !raw.includes('${')) {
    return raw;
  }

  const host = env.DB_HOST;
  const port = env.DB_PORT;
  const username = env.DB_USERNAME;
  const password = env.DB_PASSWORD;
  const database = env.DB_DATABASE;

  if (host && port && username && password && database) {
    const user = encodeURIComponent(username);
    const pass = encodeURIComponent(password);
    const query =
      raw && raw.includes('?')
        ? raw.slice(raw.indexOf('?'))
        : '?schema=public';
    return `postgresql://${user}:${pass}@${host}:${port}/${database}${query}`;
  }

  if (raw) {
    return raw
      .replace(/\$\{DB_USERNAME\}/g, encodeURIComponent(env.DB_USERNAME ?? ''))
      .replace(/\$\{DB_PASSWORD\}/g, encodeURIComponent(env.DB_PASSWORD ?? ''))
      .replace(/\$\{DB_HOST\}/g, env.DB_HOST ?? '')
      .replace(/\$\{DB_PORT\}/g, env.DB_PORT ?? '')
      .replace(/\$\{DB_DATABASE\}/g, env.DB_DATABASE ?? '');
  }

  return '';
}

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
