import { getBackendUrl } from "@/lib/config/env";

/** Trial public routes are excluded from Nest global API prefix. */
export function getTrialBackendUrl(path: string): string {
  const base = getBackendUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export async function proxyTrialRequest(
  path: string,
  init?: {
    method?: string;
    body?: string;
    contentType?: string | null;
  },
): Promise<Response> {
  const headers = new Headers();
  if (init?.contentType) {
    headers.set("Content-Type", init.contentType);
  } else if (init?.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(getTrialBackendUrl(path), {
    method: init?.method ?? "GET",
    headers,
    body: init?.body,
    cache: "no-store",
  });
}
