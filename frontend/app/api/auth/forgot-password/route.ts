import { NextResponse } from "next/server";
import { getErrorMessage, unwrapApiData } from "@/lib/api/envelope";
import { getBackendApiUrl } from "@/lib/config/env";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${getBackendApiUrl()}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      {
        message: getErrorMessage(
          json,
          "Could not send password reset email",
        ),
      },
      { status: res.status },
    );
  }

  const data = unwrapApiData<{ sent: boolean }>(json);
  return NextResponse.json({ success: true, data });
}
