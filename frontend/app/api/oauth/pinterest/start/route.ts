import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/config/env";
import { getAccessToken } from "@/lib/api/server";
import {
  buildOAuthCallbackUrl,
  extractOAuthStartErrorMessage,
} from "@/lib/oauth/oauth-app-origin";

export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.redirect(
      buildOAuthCallbackUrl(request, {
        error: "unauthorized",
        providerKey: "pinterest",
      }),
    );
  }

  const target = new URL(
    `${getBackendApiUrl()}/integrations/oauth/pinterest/start`,
  );

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
  return NextResponse.redirect(
    buildOAuthCallbackUrl(request, {
      error:
        extractOAuthStartErrorMessage(body) ??
        `oauth_start_failed (HTTP ${res.status})`,
      providerKey: "pinterest",
    }),
  );
}
