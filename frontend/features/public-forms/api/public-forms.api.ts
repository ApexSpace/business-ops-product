import type { FileAsset } from "@/lib/storage/types/storage.types";
import type { FormDefinition } from "@/features/forms/types";
import { getErrorMessage, parseEnvelope } from "@/lib/api/envelope";
import { ApiClientError } from "@/lib/api/errors";

export interface PublicFormConfig {
  publicKey: string;
  slug: string | null;
  name: string;
  definition: FormDefinition;
}

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(`/api/backend/${normalized}`, window.location.origin);

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiClientError(
      getErrorMessage(body, "Request failed"),
      res.status,
      body?.error ?? body,
    );
  }

  return parseEnvelope<T>(body).data;
}

export function getPublicFormConfig(publicKey: string) {
  return publicFetch<PublicFormConfig>(
    `public/forms/${encodeURIComponent(publicKey)}/config`,
  );
}

export interface PublicFormSubmissionResult {
  id: string;
  success: true;
  redirectUrl?: string | null;
}

export function submitPublicForm(
  publicKey: string,
  data: Record<string, unknown>,
) {
  return publicFetch<PublicFormSubmissionResult>(
    `public/forms/${encodeURIComponent(publicKey)}/submissions`,
    {
      method: "POST",
      body: JSON.stringify({ data }),
    },
  );
}

export function createPublicFormUpload(
  publicKey: string,
  input: {
    filename: string;
    mimeType: string;
    size: number;
    category: string;
    visibility?: string;
  },
) {
  return publicFetch<{ fileAssetId: string; uploadUrl: string; expiresIn: number }>(
    `public/forms/${encodeURIComponent(publicKey)}/uploads`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function confirmPublicFormUpload(publicKey: string, fileAssetId: string) {
  return publicFetch<FileAsset>(
    `public/forms/${encodeURIComponent(publicKey)}/uploads/${encodeURIComponent(fileAssetId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function failPublicFormUpload(
  publicKey: string,
  fileAssetId: string,
  reason: string,
) {
  return publicFetch<{ id: string }>(
    `public/forms/${encodeURIComponent(publicKey)}/uploads/${encodeURIComponent(fileAssetId)}/fail`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
}

export function getPublicFormFileDownloadUrl(
  publicKey: string,
  fileAssetId: string,
) {
  return publicFetch<{ downloadUrl: string; expiresIn: number }>(
    `public/forms/${encodeURIComponent(publicKey)}/files/${encodeURIComponent(fileAssetId)}/download-url`,
  );
}
