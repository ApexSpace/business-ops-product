import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/session";
import { getBackendApiUrl } from "@/lib/config/env";
import { getAccessToken, getRefreshToken } from "@/lib/api/server";

export async function POST() {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();

  if (accessToken && refreshToken) {
    await fetch(`${getBackendApiUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ success: true });
  return clearAuthCookies(response);
}
