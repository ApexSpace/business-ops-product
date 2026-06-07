/** Public API origin for embed scripts, widgets, and payment/booking links. */
export function resolveBackendPublicUrl(env: NodeJS.ProcessEnv): string {
  const explicit = env.BACKEND_PUBLIC_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const port = env.PORT?.trim() || '3000';
  const host = env.BACKEND_PUBLIC_HOST?.trim() || 'localhost';
  return `http://${host}:${port}`;
}
