import { getErrorMessage, unwrapApiData } from "@/lib/api/envelope";
import { getBackendApiUrl } from "@/lib/config/env";
import type { AuthTokensResponse } from "@/lib/types/shared";

export async function fetchRefreshTokens(
  refreshToken: string,
): Promise<AuthTokensResponse | null> {
  const res = await fetch(`${getBackendApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return null;

  try {
    return unwrapApiData<AuthTokensResponse>(json);
  } catch {
    return null;
  }
}

export function refreshErrorMessage(body: unknown): string {
  return getErrorMessage(body, "Refresh failed");
}
