import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeAccessToken } from "@/lib/auth";
import { CONTEXTS_COOKIE } from "@/lib/auth-cookies";
import { parseContextsCookie } from "@/lib/auth-session";
import { getAccessToken, backendFetch } from "@/lib/server-api";
import type { UserMe } from "@/types/api";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const jwt = decodeAccessToken(accessToken);

  let user: UserMe;
  try {
    user = await backendFetch<UserMe>("/auth/me", { accessToken });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const store = await cookies();
  const contexts =
    parseContextsCookie(store.get(CONTEXTS_COOKIE)?.value) || user.contexts;

  return NextResponse.json({
    authenticated: true,
    jwt,
    user,
    contexts,
  });
}
