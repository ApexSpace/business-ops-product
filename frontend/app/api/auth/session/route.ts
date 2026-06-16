import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeAccessToken } from "@/lib/auth";
import { CONTEXTS_COOKIE, REFRESH_MAX_AGE } from "@/lib/auth/cookies";
import { resolveSessionContexts } from "@/lib/auth/session";
import { parseApiError, parseEnvelope } from "@/lib/api/envelope";
import { getAccessToken, serverApiFetchRaw } from "@/lib/api/server";
import type { UserMe } from "@/lib/types/shared";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const jwt = decodeAccessToken(accessToken);

  let user: UserMe;
  try {
    const res = await serverApiFetchRaw("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = parseApiError(body, res.status);
      if (res.status >= 500) {
        return NextResponse.json(
          {
            authenticated: false,
            code: err.code ?? "SERVICE_UNAVAILABLE",
            message: err.message,
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          authenticated: false,
          code: err.code,
          message: err.message,
        },
        { status: res.status },
      );
    }

    user = parseEnvelope<UserMe>(body).data;
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        code: "SERVICE_UNAVAILABLE",
        message:
          "Unable to reach the backend. The API or database may be unavailable.",
      },
      { status: 503 },
    );
  }

  const store = await cookies();
  const cookieValue = store.get(CONTEXTS_COOKIE)?.value;
  const contexts = resolveSessionContexts(cookieValue, user.contexts);

  const response = NextResponse.json({
    authenticated: true,
    jwt,
    user,
    contexts,
  });

  if (
    contexts.length > 0 &&
    (!cookieValue || resolveSessionContexts(cookieValue, []).length === 0)
  ) {
    response.cookies.set(CONTEXTS_COOKIE, JSON.stringify(contexts), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_MAX_AGE,
    });
  }

  return response;
}
