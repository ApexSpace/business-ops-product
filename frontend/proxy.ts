import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";
import {
  ACCESS_TOKEN_COOKIE,
  CONTEXTS_COOKIE,
} from "@/lib/auth/cookies";
import { decodeAccessToken, getDashboardPath } from "@/lib/auth";
import { parseContextsCookie } from "@/lib/auth/session";
import type { JwtAccessPayload } from "@/lib/types/shared";
import { isPublicPath } from "@/lib/routing/public-routes";

function resolveReturnUrl(
  returnUrlParam: string | null,
  request: NextRequest,
): URL | null {
  if (!returnUrlParam) return null;
  try {
    if (returnUrlParam.startsWith("/")) {
      return new URL(returnUrlParam, request.url);
    }
    const parsed = new URL(returnUrlParam);
    if (parsed.origin === new URL(request.url).origin) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function loginRedirectWithReturnUrl(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  const returnPath =
    request.nextUrl.pathname + request.nextUrl.search;
  loginUrl.searchParams.set("returnUrl", returnPath);
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    if (token && pathname === "/login") {
      const payload = decodeAccessToken(token);
      if (payload) {
        const returnUrl = resolveReturnUrl(
          request.nextUrl.searchParams.get("returnUrl"),
          request,
        );
        if (returnUrl) {
          return NextResponse.redirect(returnUrl);
        }
        return NextResponse.redirect(
          new URL(getDashboardPath(payload.context), request.url),
        );
      }
    }
    if (token && pathname === "/select-context") {
      const contexts = parseContextsCookie(
        request.cookies.get(CONTEXTS_COOKIE)?.value,
      );
      if (contexts.length <= 1) {
        const payload = decodeAccessToken(token);
        if (payload) {
          const returnUrl = resolveReturnUrl(
            request.nextUrl.searchParams.get("returnUrl"),
            request,
          );
          if (returnUrl) {
            return NextResponse.redirect(returnUrl);
          }
          return NextResponse.redirect(
            new URL(getDashboardPath(payload.context), request.url),
          );
        }
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return loginRedirectWithReturnUrl(request);
  }

  let payload: JwtAccessPayload | null;
  try {
    payload = jwtDecode<JwtAccessPayload>(token);
  } catch {
    return loginRedirectWithReturnUrl(request);
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(getDashboardPath(payload.context), request.url),
    );
  }

  const contexts = parseContextsCookie(
    request.cookies.get(CONTEXTS_COOKIE)?.value,
  );
  if (
    contexts.length > 1 &&
    pathname !== "/select-context" &&
    !pathname.startsWith("/platform") &&
    !pathname.startsWith("/business")
  ) {
    // allow home redirect only
  }

  if (pathname.startsWith("/platform") && payload.context !== "platform") {
    if (payload.context === "business") {
      return NextResponse.redirect(
        new URL("/business/dashboard", request.url),
      );
    }
    return NextResponse.redirect(new URL("/select-context", request.url));
  }

  if (pathname.startsWith("/business") && payload.context !== "business") {
    if (payload.context === "platform") {
      return NextResponse.redirect(
        new URL("/platform/dashboard", request.url),
      );
    }
    return NextResponse.redirect(new URL("/select-context", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
