/**
 * Builds a PostgreSQL connection URL from env vars.
 * Supports a full DATABASE_URL or DB_* components (with or without ${} placeholders).
 */
export function resolveDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
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
    const query = extractQueryString(raw);
    return `postgresql://${user}:${pass}@${host}:${port}/${database}${query}`;
  }

  if (raw) {
    return expandDatabaseUrlPlaceholders(raw, env);
  }

  return '';
}

function extractQueryString(url: string | undefined): string {
  if (!url) {
    return '?schema=public';
  }
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(queryIndex) : '?schema=public';
}

function expandDatabaseUrlPlaceholders(
  template: string,
  env: NodeJS.ProcessEnv,
): string {
  return template
    .replace(/\$\{DB_USERNAME\}/g, encodeURIComponent(env.DB_USERNAME ?? ''))
    .replace(/\$\{DB_PASSWORD\}/g, encodeURIComponent(env.DB_PASSWORD ?? ''))
    .replace(/\$\{DB_HOST\}/g, env.DB_HOST ?? '')
    .replace(/\$\{DB_PORT\}/g, env.DB_PORT ?? '')
    .replace(/\$\{DB_DATABASE\}/g, env.DB_DATABASE ?? '');
}
