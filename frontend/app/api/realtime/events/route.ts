import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/api/server";
import { getBackendApiUrl } from "@/lib/config/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

function backendUnavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      message:
        "Backend API is unavailable. Ensure the NestJS server is running.",
      code: "BACKEND_UNAVAILABLE",
    },
    { status: 503 },
  );
}

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json(
      { message: "businessId required", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json(
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const target = `${getBackendApiUrl()}/realtime/business/${encodeURIComponent(businessId)}/events`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      cache: "no-store",
      signal: request.signal,
    });
  } catch {
    return backendUnavailableResponse();
  }

  if (!upstream.ok || !upstream.body) {
    const message = await upstream.text().catch(() => upstream.statusText);
    let body: { message: string; code?: string };
    try {
      body = JSON.parse(message) as { message: string; code?: string };
    } catch {
      body = { message: message || upstream.statusText };
    }
    const status = upstream.status >= 500 ? 503 : upstream.status;
    return NextResponse.json(
      {
        message: body.message || "Realtime stream unavailable",
        code: body.code ?? (status === 503 ? "BACKEND_UNAVAILABLE" : "REALTIME_ERROR"),
      },
      { status },
    );
  }

  const headers = new Headers(SSE_HEADERS);
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
