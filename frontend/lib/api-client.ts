import { getErrorMessage, unwrapApiData } from "@/lib/api-envelope";
import type { ApiErrorBody } from "@/types/api";

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
};

function buildProxyUrl(
  path: string,
  searchParams?: Record<string, string | number | boolean | undefined>,
): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(`/api/backend/${normalized}`, window.location.origin);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function tryRefreshSession(): Promise<boolean> {
  const res = await fetch("/api/auth/refresh", { method: "POST" });
  return res.ok;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));

  if (res.status === 401) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      throw new ApiClientError("RETRY", 401);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiClientError("Session expired", 401);
  }

  if (!res.ok) {
    const err = body as ApiErrorBody;
    throw new ApiClientError(
      getErrorMessage(body, res.statusText),
      res.status,
      err.code,
    );
  }

  return unwrapApiData<T>(body);
}

export async function apiClient<T>(
  path: string,
  options: FetchOptions = {},
  retried = false,
): Promise<T> {
  const { method = "GET", body, searchParams } = options;

  const res = await fetch(buildProxyUrl(path, searchParams), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  try {
    return await parseResponse<T>(res);
  } catch (err) {
    if (err instanceof ApiClientError && err.message === "RETRY" && !retried) {
      return apiClient<T>(path, options, true);
    }
    throw err;
  }
}
