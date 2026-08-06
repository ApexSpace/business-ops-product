import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/config/env";
import { getAccessToken } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // #region agent log
    fetch("http://127.0.0.1:7562/ingest/925a1149-217c-4daf-b03b-d66e64dfadce", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "8fdcd5",
      },
      body: JSON.stringify({
        sessionId: "8fdcd5",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "oauth/tiktok/start/route.ts",
        message: "TikTok OAuth start missing access token",
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const redirectUrl = new URL("/oauth/callback", request.url);
    redirectUrl.searchParams.set("error", "unauthorized");
    redirectUrl.searchParams.set("providerKey", "tiktok");
    return NextResponse.redirect(redirectUrl);
  }

  const target = new URL(
    `${getBackendApiUrl()}/integrations/oauth/tiktok/start`,
  );

  const res = await fetch(target.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "manual",
    cache: "no-store",
  });

  // #region agent log
  {
    const location = res.headers.get("location");
    let locationHost: string | null = null;
    let locationHasClientKey = false;
    let clientKeyParamPreview: string | null = null;
    let redirectUriParam: string | null = null;
    let scopeParam: string | null = null;
    if (location) {
      try {
        const loc = new URL(location);
        locationHost = loc.host;
        const ck = loc.searchParams.get("client_key");
        locationHasClientKey = Boolean(ck);
        clientKeyParamPreview = ck
          ? `${ck.slice(0, 4)}…${ck.slice(-4)} (len=${ck.length})`
          : null;
        redirectUriParam = loc.searchParams.get("redirect_uri");
        scopeParam = loc.searchParams.get("scope");
      } catch {
        locationHost = "parse_failed";
      }
    }
    fetch("http://127.0.0.1:7562/ingest/925a1149-217c-4daf-b03b-d66e64dfadce", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "8fdcd5",
      },
      body: JSON.stringify({
        sessionId: "8fdcd5",
        runId: "pre-fix",
        hypothesisId: "B",
        location: "oauth/tiktok/start/route.ts",
        message: "TikTok OAuth start proxy response",
        data: {
          backendTarget: target.toString(),
          status: res.status,
          hasLocation: Boolean(location),
          locationHost,
          locationHasClientKey,
          clientKeyParamPreview,
          redirectUriParam,
          scopeParam,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (location) {
      return NextResponse.redirect(location);
    }
  }

  const body = await res.text();
  // #region agent log
  fetch("http://127.0.0.1:7562/ingest/925a1149-217c-4daf-b03b-d66e64dfadce", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "8fdcd5",
    },
    body: JSON.stringify({
      sessionId: "8fdcd5",
      runId: "pre-fix",
      hypothesisId: "C",
      location: "oauth/tiktok/start/route.ts",
      message: "TikTok OAuth start failed non-redirect",
      data: {
        status: res.status,
        bodyPreview: body.slice(0, 300),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const redirectUrl = new URL("/oauth/callback", request.url);
  redirectUrl.searchParams.set("error", "oauth_start_failed");
  redirectUrl.searchParams.set("providerKey", "tiktok");
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
