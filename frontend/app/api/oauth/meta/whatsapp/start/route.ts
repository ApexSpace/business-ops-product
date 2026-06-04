import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/config/env";
import { getAccessToken } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    const redirectUrl = new URL("/oauth/callback", request.url);
    redirectUrl.searchParams.set("error", "unauthorized");
    redirectUrl.searchParams.set("providerKey", "whatsapp");
    return NextResponse.redirect(redirectUrl);
  }

  const target = new URL(
    `${getBackendApiUrl()}/integrations/oauth/meta/whatsapp/start`,
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

  const redirectUrl = new URL("/oauth/callback", request.url);
  redirectUrl.searchParams.set("error", "oauth_start_failed");
  redirectUrl.searchParams.set("providerKey", "whatsapp");
  return NextResponse.redirect(redirectUrl);
}
