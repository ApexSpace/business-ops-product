let cachedToken: string | null = null;
let cachedUntil = 0;

const CACHE_TTL_MS = 60_000;

/** Clears cached WS token (e.g. on logout). */
export function clearWsAccessTokenCache(): void {
  cachedToken = null;
  cachedUntil = 0;
}

/**
 * Fetches access token for Socket.io handshake via Next.js API route.
 * Short in-memory cache avoids hammering /api/realtime/ws-token on reconnects.
 */
export async function fetchWsAccessToken(): Promise<string | null> {
  if (cachedToken && cachedUntil > Date.now()) {
    return cachedToken;
  }

  try {
    const response = await fetch("/api/realtime/ws-token", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      clearWsAccessTokenCache();
      return null;
    }

    const data = (await response.json()) as { accessToken?: string };
    const token = data.accessToken?.trim();
    if (!token) {
      clearWsAccessTokenCache();
      return null;
    }

    cachedToken = token;
    cachedUntil = Date.now() + CACHE_TTL_MS;
    return token;
  } catch {
    clearWsAccessTokenCache();
    return null;
  }
}
