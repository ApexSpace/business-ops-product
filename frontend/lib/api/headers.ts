import { getClientPlatform, getClientVersion } from "@/lib/config/client";

export type ApiRequestHeaders = {
  "Content-Type"?: string;
  "Idempotency-Key"?: string;
  "X-Client-Platform"?: string;
  "X-Client-Version"?: string;
  "X-App-Version"?: string;
  "X-Feature-Flags"?: string;
};

export function buildApiHeaders(options?: {
  body?: unknown;
  idempotencyKey?: string;
  featureFlags?: string[];
}): HeadersInit {
  const headers: Record<string, string> = {};
  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }
  const platform = getClientPlatform();
  if (platform) {
    headers["X-Client-Platform"] = platform;
  }
  const version = getClientVersion();
  if (version) {
    headers["X-Client-Version"] = version;
    headers["X-App-Version"] = version;
  }
  if (options?.featureFlags?.length) {
    headers["X-Feature-Flags"] = options.featureFlags.join(",");
  }
  return headers;
}
