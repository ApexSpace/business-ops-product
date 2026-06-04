import { NextResponse } from "next/server";
import { getErrorMessage, unwrapApiData } from "@/lib/api/envelope";
import { setAuthCookies } from "@/lib/auth/session";
import { getBackendApiUrl } from "@/lib/config/env";
import { getAccessToken } from "@/lib/api/server";
import type { AuthTokensResponse } from "@/lib/types/shared";

export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const res = await fetch(`${getBackendApiUrl()}/auth/switch-context`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { message: getErrorMessage(json, "Switch context failed") },
      { status: res.status },
    );
  }

  const tokens = unwrapApiData<AuthTokensResponse>(json);
  const response = NextResponse.json({ success: true, data: tokens });
  return setAuthCookies(response, tokens);
}
