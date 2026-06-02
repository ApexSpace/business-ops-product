import { NextResponse } from "next/server";
import { getErrorMessage, unwrapApiData } from "@/lib/api-envelope";
import {
  clearAuthCookies,
  setAuthCookies,
} from "@/lib/auth-session";
import { getBackendApiUrl } from "@/lib/env";
import { getRefreshToken } from "@/lib/server-api";
import type { AuthTokensResponse } from "@/types/api";

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    const response = NextResponse.json(
      { message: "No refresh token" },
      { status: 401 },
    );
    return clearAuthCookies(response);
  }

  const res = await fetch(`${getBackendApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const response = NextResponse.json(
      { message: getErrorMessage(json, "Refresh failed") },
      { status: res.status },
    );
    return clearAuthCookies(response);
  }

  const tokens = unwrapApiData<AuthTokensResponse>(json);
  const response = NextResponse.json({ success: true, data: tokens });
  return setAuthCookies(response, tokens);
}
