import { NextResponse } from "next/server";
import { proxyTrialRequest } from "@/lib/api/trial-backend";

export async function GET() {
  const res = await proxyTrialRequest("/public/trial/embed");
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
