import { NextResponse } from "next/server";
import { getErrorMessage, unwrapApiData } from "@/lib/api-envelope";
import { setAuthCookies } from "@/lib/auth-session";
import { getBackendApiUrl } from "@/lib/env";
import type { AuthTokensResponse } from "@/types/api";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${getBackendApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { message: getErrorMessage(json, "Login failed") },
      { status: res.status },
    );
  }

  const tokens = unwrapApiData<AuthTokensResponse>(json);
  const response = NextResponse.json({ success: true, data: tokens });
  return setAuthCookies(response, tokens);
}
