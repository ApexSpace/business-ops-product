import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth-cookies";
import { getErrorMessage, unwrapApiData } from "@/lib/api-envelope";
import { getBackendApiUrl } from "@/lib/env";

const BACKEND_FETCH_TIMEOUT_MS = 15_000;

function apiUrl(): string {
  return getBackendApiUrl();
}

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

export async function backendFetch<T>(
  path: string,
  init?: RequestInit & { accessToken?: string },
): Promise<T> {
  const token = init?.accessToken ?? (await getAccessToken());
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${apiUrl()}${path}`, {
    ...backendFetchInit(init),
    headers,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      getErrorMessage(body, res.statusText || "Request failed"),
    );
  }

  return unwrapApiData<T>(body);
}

export async function backendFetchRaw(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${apiUrl()}${path}`, {
    ...backendFetchInit(init),
    headers,
  });
}
