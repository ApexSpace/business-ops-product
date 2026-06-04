import { NextResponse } from "next/server";
import { getErrorMessage, unwrapApiData } from "@/lib/api/envelope";
import { getBackendApiUrl } from "@/lib/config/env";
import { getAccessToken } from "@/lib/api/server";
import type { UserMe } from "@/lib/types/shared";

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
