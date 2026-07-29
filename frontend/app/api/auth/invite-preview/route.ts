import { NextResponse } from "next/server";
import { getErrorMessage, unwrapApiData } from "@/lib/api/envelope";
import { getBackendApiUrl } from "@/lib/config/env";

export type InvitePreview = {
  businessName: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  inviterName?: string | null;
  requiresPassword: boolean;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { message: "Invite token is required" },
      { status: 400 },
    );
  }

  const res = await fetch(
    `${getBackendApiUrl()}/auth/invite-preview?token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { message: getErrorMessage(json, "Invalid or expired invite") },
      { status: res.status },
    );
  }

  const data = unwrapApiData<InvitePreview>(json);
  return NextResponse.json({ data });
}
