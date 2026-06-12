import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/api/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Returns the access token for direct Socket.io auth.
 * Token is httpOnly in cookies — browser JS cannot read it otherwise.
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  return NextResponse.json({ accessToken });
}
