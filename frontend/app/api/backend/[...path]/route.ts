import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api/envelope";
import { clearAuthCookies, setAuthCookies } from "@/lib/auth/session";
import { fetchRefreshTokens } from "@/lib/auth/refresh-session";
import { getBackendApiUrl } from "@/lib/config/env";
import { getAccessToken, getRefreshToken } from "@/lib/api/server";

/** Fail fast when backend/DB hangs (Prisma timeouts can exceed 60s). */
const BACKEND_FETCH_TIMEOUT_MS = 30_000;
/** Report PDF/Excel generation can exceed the default window. */
const BACKEND_EXPORT_TIMEOUT_MS = 120_000;

function serviceErrorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    {
      data: null,
      meta: {},
      error: { code, message, details: [] },
      message,
      code,
    },
    { status },
  );
}

function resolveForwardTimeoutMs(path: string): number {
  if (path.includes("/export") || /(^|\/)export$/.test(path)) {
    return BACKEND_EXPORT_TIMEOUT_MS;
  }
  return BACKEND_FETCH_TIMEOUT_MS;
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return true;
  const normalized = contentType.toLowerCase();
  return (
    normalized.includes("application/json") || normalized.includes("+json")
  );
}

async function forward(
  request: NextRequest,
  path: string,
  accessToken: string | undefined,
): Promise<Response> {
  const url = new URL(request.url);
  const target = `${getBackendApiUrl()}/${path}${url.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    resolveForwardTimeoutMs(path),
  );

  try {
    return await fetch(target, {
      method: request.method,
      headers,
      body: body || undefined,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildProxiedResponse(
  res: Response,
  body: BodyInit | null,
  refreshedTokens: Awaited<ReturnType<typeof fetchRefreshTokens>>,
): NextResponse {
  const headers = new Headers();
  const contentType = res.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const contentDisposition = res.headers.get("content-disposition");
  if (contentDisposition) {
    headers.set("Content-Disposition", contentDisposition);
  }

  const response = new NextResponse(body, {
    status: res.status,
    headers,
  });
  if (refreshedTokens) {
    setAuthCookies(response, refreshedTokens);
  }
  return response;
}

async function proxy(
  request: NextRequest,
  params: { path: string[] },
): Promise<NextResponse> {
  const path = params.path.join("/");
  let accessToken = await getAccessToken();

  let res: Response;
  try {
    res = await forward(request, path, accessToken);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return serviceErrorResponse(
        504,
        "SERVICE_TIMEOUT",
        "The server took too long to respond. The database or API may be unavailable — please try again shortly.",
      );
    }
    return serviceErrorResponse(
      503,
      "BACKEND_UNAVAILABLE",
      "Backend API is unavailable. Ensure the NestJS server is running and the database is reachable.",
    );
  }

  let refreshedTokens = null;

  if (res.status === 401) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      refreshedTokens = await fetchRefreshTokens(refreshToken);
      if (refreshedTokens) {
        accessToken = refreshedTokens.accessToken;
        try {
          res = await forward(request, path, accessToken);
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            return serviceErrorResponse(
              504,
              "SERVICE_TIMEOUT",
              "The server took too long to respond. Please try again shortly.",
            );
          }
          return serviceErrorResponse(
            503,
            "BACKEND_UNAVAILABLE",
            "Backend API is unavailable. Ensure the NestJS server is running.",
          );
        }
      }
    }
  }

  if (res.status === 204 || res.status === 205) {
    const response = new NextResponse(null, { status: res.status });
    if (refreshedTokens) {
      setAuthCookies(response, refreshedTokens);
    }
    return response;
  }

  if (!isJsonContentType(res.headers.get("content-type"))) {
    if (res.status === 401) {
      const response = NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
      return clearAuthCookies(response);
    }
    const buffer = await res.arrayBuffer();
    return buildProxiedResponse(res, buffer, refreshedTokens);
  }

  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    const response = NextResponse.json(
      { message: getErrorMessage(json, "Unauthorized") },
      { status: 401 },
    );
    return clearAuthCookies(response);
  }

  const response = NextResponse.json(json, { status: res.status });
  if (refreshedTokens) {
    setAuthCookies(response, refreshedTokens);
  }
  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await context.params);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await context.params);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await context.params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await context.params);
}
