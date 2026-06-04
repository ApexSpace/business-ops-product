/**
 * Sentry integration (Phase 3).
 * Install @sentry/nextjs when a Next.js 16–compatible release is available,
 * then wire init in instrumentation-client.ts per Sentry docs.
 */
export function initSentry(): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  if (process.env.NODE_ENV === "development") {
    console.debug(
      "[sentry] NEXT_PUBLIC_SENTRY_DSN is set; add @sentry/nextjs when peer supports Next 16",
    );
  }
}

export function captureApiError(
  error: unknown,
  context?: { route?: string; code?: string; requestId?: string },
): void {
  if (process.env.NODE_ENV === "development" && context?.requestId) {
    const route = context.route ? ` route=${context.route}` : "";
    const code = context.code ? ` code=${context.code}` : "";
    console.debug(`[api-error] requestId=${context.requestId}${route}${code}`);
  }
}
