import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cookies";
import { parseApiError, parseEnvelope } from "./envelope";
import { buildApiHeaders } from "./headers";
import { getBackendApiUrl } from "@/lib/config/env";

const BACKEND_FETCH_TIMEOUT_MS = 30_000;

function backendFetchInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(BACKEND_FETCH_TIMEOUT_MS),
  };
}

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value;
}

export async function serverApiFetch<T>(
  path: string,
  init?: RequestInit & { accessToken?: string },
): Promise<T> {
  const token = init?.accessToken ?? (await getAccessToken());
  const headers = new Headers(buildApiHeaders({ body: init?.body }));
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init?.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${getBackendApiUrl()}${normalized}`, {
    ...backendFetchInit(init),
    headers,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = parseApiError(body, res.status);
    throw new Error(err.message);
  }

  return parseEnvelope<T>(body).data;
}

export async function serverApiFetchRaw(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(buildApiHeaders());
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init?.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${getBackendApiUrl()}${normalized}`, {
    ...backendFetchInit(init),
    headers,
  });
}
