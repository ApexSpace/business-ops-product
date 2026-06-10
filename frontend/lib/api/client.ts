import {
  getErrorMessage,
  parseApiError,
  parseEnvelope,
  parsePaginated,
} from "./envelope";
import { ApiClientError } from "./errors";
import {
  classifyApiError,
  emitBusinessAccessBlocked,
  emitFeatureUnavailable,
} from "./error-classifier";
import {
  FetchNetworkError,
  FetchTimeoutError,
  fetchWithTimeout,
} from "./fetch-with-timeout";
import { buildApiHeaders } from "./headers";
import type { PaginatedList } from "./pagination";
import { toSearchParams } from "./pagination";

export { ApiClientError } from "./errors";

export type ApiClientOptions = {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
  featureFlags?: string[];
};

function buildProxyUrl(
  path: string,
  searchParams?: Record<string, string | number | boolean | undefined | null>,
): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(`/api/backend/${normalized}`, window.location.origin);
  const params = toSearchParams(searchParams);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function tryRefreshSession(): Promise<boolean> {
  const res = await fetchWithTimeout("/api/auth/refresh", { method: "POST" });
  return res.ok;
}

function mapFetchFailure(err: unknown): ApiClientError {
  if (err instanceof FetchTimeoutError) {
    return new ApiClientError(
      "The server took too long to respond. Please try again.",
      504,
      { code: "SERVICE_TIMEOUT" },
    );
  }
  if (err instanceof FetchNetworkError) {
    return new ApiClientError(
      "Could not reach the application server.",
      503,
      { code: "BACKEND_UNAVAILABLE" },
    );
  }
  if (err instanceof ApiClientError) {
    return err;
  }
  return new ApiClientError("Request failed", 0);
}

async function apiFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetchWithTimeout(url, init);
  } catch (err) {
    throw mapFetchFailure(err);
  }
}

function handleClassifiedError(error: ApiClientError): never {
  const category = classifyApiError(error);
  if (category === "business_access") {
    emitBusinessAccessBlocked({
      code: error.code,
      message: error.message,
    });
  } else if (category === "capability") {
    emitFeatureUnavailable({
      code: error.code,
      message: error.message,
    });
  }
  throw error;
}

async function handleAuthFailure(): Promise<never> {
  const refreshed = await tryRefreshSession();
  if (refreshed) {
    throw new ApiClientError("RETRY", 401);
  }
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
  throw new ApiClientError("Session expired", 401);
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));

  if (res.status === 401) {
    return handleAuthFailure();
  }

  if (!res.ok) {
    const error = parseApiError(body, res.status);
    if (res.status === 403) {
      handleClassifiedError(error);
    }
    throw error;
  }

  return parseEnvelope<T>(body).data;
}

async function requestWithMeta<T>(
  path: string,
  options: ApiClientOptions = {},
  retried = false,
): Promise<{ data: T; meta: import("./envelope").ApiEnvelopeMeta }> {
  const { method = "GET", body, searchParams, idempotencyKey, featureFlags } =
    options;

  const res = await apiFetch(buildProxyUrl(path, searchParams), {
    method,
    headers: buildApiHeaders({ body, idempotencyKey, featureFlags }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  try {
    const raw = await res.json().catch(() => ({}));

    if (res.status === 401) {
      return handleAuthFailure();
    }

    if (!res.ok) {
      const error = parseApiError(raw, res.status);
      if (res.status === 403) {
        handleClassifiedError(error);
      }
      throw error;
    }

    return parseEnvelope<T>(raw);
  } catch (err) {
    if (err instanceof ApiClientError && err.message === "RETRY" && !retried) {
      return requestWithMeta<T>(path, options, true);
    }
    throw err;
  }
}

async function request<T>(
  path: string,
  options: ApiClientOptions = {},
  retried = false,
): Promise<T> {
  const { method = "GET", body, searchParams, idempotencyKey, featureFlags } =
    options;

  const res = await apiFetch(buildProxyUrl(path, searchParams), {
    method,
    headers: buildApiHeaders({ body, idempotencyKey, featureFlags }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  try {
    return await parseResponse<T>(res);
  } catch (err) {
    if (err instanceof ApiClientError && err.message === "RETRY" && !retried) {
      return request<T>(path, options, true);
    }
    throw err;
  }
}

async function requestPaginated<T>(
  path: string,
  options: ApiClientOptions = {},
  retried = false,
): Promise<PaginatedList<T>> {
  const { method = "GET", body, searchParams, idempotencyKey, featureFlags } =
    options;

  const res = await apiFetch(buildProxyUrl(path, searchParams), {
    method,
    headers: buildApiHeaders({ body, idempotencyKey, featureFlags }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  try {
    const raw = await res.json().catch(() => ({}));

    if (res.status === 401) {
      return handleAuthFailure();
    }

    if (!res.ok) {
      const error = parseApiError(raw, res.status);
      if (res.status === 403) {
        handleClassifiedError(error);
      }
      throw error;
    }

    const { items, pagination } = parsePaginated<T>(raw);
    return { items, meta: pagination };
  } catch (err) {
    if (err instanceof ApiClientError && err.message === "RETRY" && !retried) {
      return requestPaginated<T>(path, options, true);
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, opts?: Omit<ApiClientOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),

  getEnvelope: <T>(path: string, opts?: Omit<ApiClientOptions, "method" | "body">) =>
    requestWithMeta<T>(path, { ...opts, method: "GET" }),

  getPaginated: <T>(
    path: string,
    opts?: Omit<ApiClientOptions, "method" | "body">,
  ) => requestPaginated<T>(path, { ...opts, method: "GET" }),

  post: <T>(path: string, body?: unknown, opts?: ApiClientOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),

  /** POST returning full envelope (data + meta) for async job responses. */
  postWithMeta: <T>(path: string, body?: unknown, opts?: ApiClientOptions) =>
    requestWithMeta<T>(path, { ...opts, method: "POST", body }),

  patch: <T>(path: string, body?: unknown, opts?: ApiClientOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),

  put: <T>(path: string, body?: unknown, opts?: ApiClientOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),

  delete: <T>(path: string, opts?: ApiClientOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

/** Backward-compatible alias */
export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  return request<T>(path, options);
}

export type { PaginationMeta, PaginatedList } from "./pagination";
export type { ApiEnvelopeMeta } from "./envelope";

/** @deprecated Prefer api.getPaginated */
export { getErrorMessage };
