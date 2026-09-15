import type { FileVisibility } from "@/lib/storage/types/storage.types";

export function parseAcceptAttribute(accept?: string): {
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
} {
  if (!accept?.trim() || accept.trim() === "*/*") {
    return {};
  }

  const parts = accept
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const allowedMimeTypes = parts.filter((part) => part.includes("/"));
  const allowedExtensions = parts
    .filter((part) => part.startsWith("."))
    .map((part) => part.slice(1));

  return {
    allowedMimeTypes: allowedMimeTypes.length ? allowedMimeTypes : undefined,
    allowedExtensions: allowedExtensions.length ? allowedExtensions : undefined,
  };
}

export const FORM_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const FORM_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const DEFAULT_FORM_FILE_MAX_MB = 25;

export type FormUploadContext = {
  publicKey?: string;
  visibility?: FileVisibility;
};
