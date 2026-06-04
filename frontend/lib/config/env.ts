function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See frontend/.env.example`,
    );
  }
  return value;
}

/** NestJS origin, e.g. http://localhost:3000 */
export function getBackendUrl(): string {
  return requireEnv("BACKEND_URL").replace(/\/$/, "");
}

/** Full API base URL, e.g. http://localhost:3000/api/v1 */
export function getBackendApiUrl(): string {
  const prefix = (process.env.API_PREFIX ?? "api/v1").replace(/^\//, "");
  return `${getBackendUrl()}/${prefix}`;
}
