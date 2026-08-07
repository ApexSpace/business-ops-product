import type { NextRequest } from "next/server";

/**
 * Public app origin for OAuth error redirects.
 * Prefer NEXT_PUBLIC_APP_URL so Docker/proxy request.url (e.g. 0.0.0.0:3000)
 * is never used as the browser redirect base.
 */
export function resolveOAuthAppOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.headers.get("host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const proto = forwardedProto || "https";

  if (host && !host.startsWith("0.0.0.0") && host !== "localhost") {
    return `${proto}://${host}`;
  }

  try {
    const url = new URL(request.url);
    if (url.hostname && url.hostname !== "0.0.0.0") {
      return url.origin;
    }
  } catch {
    // ignore
  }

  return "http://localhost:3001";
}

export function buildOAuthCallbackUrl(
  request: NextRequest,
  params: {
    error?: string;
    providerKey?: string;
    connected?: string;
  },
): URL {
  const url = new URL("/oauth/callback", `${resolveOAuthAppOrigin(request)}/`);
  if (params.error) url.searchParams.set("error", params.error);
  if (params.providerKey) url.searchParams.set("providerKey", params.providerKey);
  if (params.connected) url.searchParams.set("connected", params.connected);
  return url;
}

export function extractOAuthStartErrorMessage(body: string): string | null {
  if (!body?.trim()) return null;
  try {
    const parsed = JSON.parse(body) as {
      message?: string;
      error?: { message?: string } | string | null;
    };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
    if (
      parsed.error &&
      typeof parsed.error === "object" &&
      typeof parsed.error.message === "string" &&
      parsed.error.message.trim()
    ) {
      return parsed.error.message.trim();
    }
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    // ignore non-json
  }
  return null;
}
