import { getPublicBackendUrl } from "@/lib/config/public-backend-url";

/**
 * WebSocket origin for direct Socket.io connections to the NestJS API.
 * Set NEXT_PUBLIC_BACKEND_WS_URL or derive ws(s):// from NEXT_PUBLIC_BACKEND_URL.
 */
export function getBackendWebSocketUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_WS_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const httpBase = getPublicBackendUrl();
  if (!httpBase) {
    return null;
  }

  try {
    const url = new URL(httpBase);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.origin;
  } catch {
    return null;
  }
}
