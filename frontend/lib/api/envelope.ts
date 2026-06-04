import { ApiClientError, extractFieldErrors } from "./errors";
import type { PaginationMeta } from "./pagination";

export type { ApiErrorDetail } from "./errors";
import type { ApiErrorDetail } from "./errors";

export type ApiEnvelopeError = {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
};

export type ApiEnvelopeMeta = {
  requestId?: string;
  pagination?: PaginationMeta;
  [key: string]: unknown;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: ApiEnvelopeMeta;
  error: null;
  success?: boolean;
  timestamp?: string;
};

export type ApiErrorEnvelope = {
  data: null;
  meta: ApiEnvelopeMeta;
  error: ApiErrorDetail[] | ApiEnvelopeError | null;
  success?: false;
  statusCode?: number;
  code?: string;
  message?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEnvelopeError(error: unknown): error is ApiEnvelopeError {
  return (
    isRecord(error) &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  );
}

export function parseEnvelope<T>(body: unknown): { data: T; meta: ApiEnvelopeMeta } {
  if (!isRecord(body)) {
    return { data: body as T, meta: {} };
  }

  if ("error" in body && body.error !== null && body.data === null) {
    throw parseApiError(body, 400);
  }

  if ("data" in body && body.error === null) {
    const meta = isRecord(body.meta) ? (body.meta as ApiEnvelopeMeta) : {};
    return { data: body.data as T, meta };
  }

  if ("success" in body && body.success === true && "data" in body) {
    return { data: body.data as T, meta: {} };
  }

  if ("items" in body && Array.isArray(body.items)) {
    const legacyMeta = isRecord(body.meta)
      ? (body.meta as PaginationMeta)
      : undefined;
    return {
      data: body.items as T,
      meta: legacyMeta ? { pagination: legacyMeta } : {},
    };
  }

  return { data: body as T, meta: {} };
}

export function parsePaginated<T>(body: unknown): {
  items: T[];
  pagination: PaginationMeta;
  meta: ApiEnvelopeMeta;
} {
  const { data, meta } = parseEnvelope<T[] | { items: T[]; meta?: PaginationMeta }>(
    body,
  );

  if (Array.isArray(data)) {
    const pagination =
      meta.pagination ??
      ({
        total: data.length,
        page: 1,
        limit: data.length || 20,
        totalPages: 1,
      } satisfies PaginationMeta);
    return { items: data, pagination, meta };
  }

  if (isRecord(data) && Array.isArray(data.items)) {
    const pagination =
      meta.pagination ??
      (isRecord(data.meta) ? (data.meta as PaginationMeta) : undefined) ??
      ({
        total: data.items.length,
        page: 1,
        limit: data.items.length || 20,
        totalPages: 1,
      } satisfies PaginationMeta);
    return { items: data.items as T[], pagination, meta };
  }

  return {
    items: [],
    pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    meta,
  };
}

export function parseApiError(body: unknown, status: number): ApiClientError {
  if (!isRecord(body)) {
    return new ApiClientError(
      status >= 500
        ? "Something went wrong on the server. Please try again."
        : "Request failed",
      status,
    );
  }

  const requestId =
    isRecord(body.meta) && typeof body.meta.requestId === "string"
      ? body.meta.requestId
      : undefined;

  const envelopeError = body.error;
  if (isEnvelopeError(envelopeError)) {
    return new ApiClientError(envelopeError.message, status, {
      code: envelopeError.code,
      requestId,
      fieldErrors: extractFieldErrors(envelopeError.details),
    });
  }

  const legacyCode = typeof body.code === "string" ? body.code : undefined;
  const legacyMessage =
    typeof body.message === "string"
      ? body.message
      : typeof body.error === "string"
        ? body.error
        : status >= 500
          ? "Something went wrong on the server. Please try again."
          : "Request failed";

  const legacyErrors = isRecord(body.errors)
    ? (body.errors as Record<string, string[]>)
    : undefined;

  return new ApiClientError(legacyMessage, status, {
    code: legacyCode,
    requestId,
    fieldErrors: legacyErrors,
  });
}

/** @deprecated Use parseEnvelope — kept for BFF/server helpers during migration */
export function unwrapApiData<T>(body: unknown): T {
  return parseEnvelope<T>(body).data;
}

/** @deprecated Use ApiClientError.message — kept for BFF routes */
export function getErrorMessage(body: unknown, fallback: string): string {
  if (!isRecord(body)) return fallback;
  if (isEnvelopeError(body.error)) return body.error.message;
  if (typeof body.message === "string") return body.message;
  return fallback;
}
