import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";
import {
  ACCESS_TOKEN_COOKIE,
  CONTEXTS_COOKIE,
} from "@/lib/auth-cookies";
import { decodeAccessToken, getDashboardPath } from "@/lib/auth";
import { parseContextsCookie } from "@/lib/auth-session";
import type { JwtAccessPayload } from "@/types/api";

const PUBLIC_PATHS = ["/login", "/select-context"];

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/refresh")
  );
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

  if (isPublic(pathname)) {
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    if (token && pathname === "/login") {
      const payload = decodeAccessToken(token);
      if (payload) {
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
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let payload: JwtAccessPayload | null;
  try {
    payload = jwtDecode<JwtAccessPayload>(token);
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
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
