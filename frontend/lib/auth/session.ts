import { NextResponse } from "next/server";
import {
  ACCESS_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  CONTEXTS_COOKIE,
  REFRESH_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
} from "./cookies";
import type { AuthContextItem, AuthTokensResponse } from "@/lib/types/shared";

export function setAuthCookies(
  response: NextResponse,
  tokens: AuthTokensResponse,
): NextResponse {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
  response.cookies.set(
    CONTEXTS_COOKIE,
    JSON.stringify(tokens.contexts),
    {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_MAX_AGE,
    },
  );
  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(CONTEXTS_COOKIE);
  return response;
}

export function parseContextsCookie(value?: string): AuthContextItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as AuthContextItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Prefer non-empty API contexts over an empty/stale cookie (`[]` is truthy in JS). */
export function resolveSessionContexts(
  cookieValue: string | undefined,
  apiContexts: AuthContextItem[],
): AuthContextItem[] {
  const fromCookie = parseContextsCookie(cookieValue);
  if (fromCookie.length > 0) return fromCookie;
  return apiContexts;
}
