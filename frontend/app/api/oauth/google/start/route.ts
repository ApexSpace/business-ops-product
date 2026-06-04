import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/config/env";
import { hasOAuthStartRoute, isGoogleOAuthProvider } from "@/features/integrations/utils/integrations";
import { getAccessToken } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const providerKey = request.nextUrl.searchParams.get("providerKey");
  if (!providerKey) {
    return NextResponse.json(
      { message: "providerKey is required" },
      { status: 400 },
    );
  }

  if (!isGoogleOAuthProvider(providerKey)) {
    const redirectUrl = new URL("/oauth/callback", request.url);
    redirectUrl.searchParams.set(
      "error",
      hasOAuthStartRoute(providerKey)
        ? "oauth_wrong_handler"
        : "oauth_route_not_configured",
    );
    redirectUrl.searchParams.set("providerKey", providerKey);
    return NextResponse.redirect(redirectUrl);
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    const redirectUrl = new URL("/oauth/callback", request.url);
    redirectUrl.searchParams.set("error", "unauthorized");
    if (providerKey) {
      redirectUrl.searchParams.set("providerKey", providerKey);
    }
    return NextResponse.redirect(redirectUrl);
  }

  const target = new URL(
    `${getBackendApiUrl()}/integrations/oauth/google/start`,
  );
  target.searchParams.set("providerKey", providerKey);

  const res = await fetch(target.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "manual",
    cache: "no-store",
  });

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (location) {
      return NextResponse.redirect(location);
    }
  }

  const body = await res.text();
  const redirectUrl = new URL("/oauth/callback", request.url);
  redirectUrl.searchParams.set("error", "oauth_start_failed");
  if (providerKey) {
    redirectUrl.searchParams.set("providerKey", providerKey);
  }
  if (body) {
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) {
        redirectUrl.searchParams.set("error", parsed.message);
      }
    } catch {
      // ignore non-json body
    }
  }
  return NextResponse.redirect(redirectUrl);
}
