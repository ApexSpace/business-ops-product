import { NextRequest, NextResponse } from "next/server";
import { proxyTrialRequest } from "@/lib/api/trial-backend";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const res = await proxyTrialRequest("/public/trial/phone/verify-otp", {
    method: "POST",
    body,
    contentType: request.headers.get("content-type"),
  });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
