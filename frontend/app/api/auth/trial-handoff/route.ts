import { NextResponse } from "next/server";
import { getErrorMessage, unwrapApiData } from "@/lib/api/envelope";
import { setAuthCookies } from "@/lib/auth/session";
import { getBackendApiUrl } from "@/lib/config/env";
import type { AuthTokensResponse } from "@/lib/types/shared";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(
    `${getBackendApiUrl()}/auth/trial/handoff/exchange`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      {
        message: getErrorMessage(
          json,
          "Your signup session expired. Please sign in.",
        ),
      },
      { status: res.status },
    );
  }

  const tokens = unwrapApiData<AuthTokensResponse>(json);
  const response = NextResponse.json({ success: true, data: tokens });
  return setAuthCookies(response, tokens);
}
