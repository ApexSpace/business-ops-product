import { NextResponse } from "next/server";
import { getErrorMessage, unwrapApiData } from "@/lib/api-envelope";
import { getBackendApiUrl } from "@/lib/env";
import { getAccessToken } from "@/lib/server-api";
import type { UserMe } from "@/types/api";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${getBackendApiUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { message: getErrorMessage(json, "Failed to load profile") },
      { status: res.status },
    );
  }

  const user = unwrapApiData<UserMe>(json);
  return NextResponse.json({ success: true, data: user });
}
