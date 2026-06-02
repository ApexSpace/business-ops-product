import type { AuthContextItem, AuthTokensResponse } from "@/types/api";
import { decodeAccessToken, getDashboardPath } from "@/lib/auth";

export function resolvePostLoginPath(
  tokens: AuthTokensResponse,
): string {
  const { contexts } = tokens;

  if (contexts.length === 0) {
    return "/login?error=no_access";
  }

  if (contexts.length === 1) {
    return getDashboardPath(contexts[0].type);
  }

  const payload = decodeAccessToken(tokens.accessToken);
  if (payload) {
    return getDashboardPath(payload.context);
  }

  return "/select-context";
}

export function needsContextSelection(contexts: AuthContextItem[]): boolean {
  return contexts.length > 1;
}
