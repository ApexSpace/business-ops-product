import { ApiClientError } from "@/lib/api/client";

export type StorageUploadErrorCode =
  | "VALIDATION_FAILED"
  | "CREATE_UPLOAD_FAILED"
  | "SIGNED_UPLOAD_FAILED"
  | "CONFIRM_UPLOAD_FAILED"
  | "FAIL_UPLOAD_FAILED"
  | "UNKNOWN";

export class StorageUploadError extends Error {
  code: StorageUploadErrorCode;
  details?: unknown;

  constructor(
    message: string,
    code: StorageUploadErrorCode,
    details?: unknown,
  ) {
    super(message);
    this.name = "StorageUploadError";
    this.code = code;
    this.details = details;
  }
}

export function normalizeUploadError(error: unknown): StorageUploadError {
  if (error instanceof StorageUploadError) {
    return error;
  }

  if (error instanceof ApiClientError) {
    return new StorageUploadError(
      error.message,
      "CREATE_UPLOAD_FAILED",
      error,
    );
  }

  if (error instanceof Error) {
    return new StorageUploadError(error.message, "UNKNOWN", error);
  }

  return new StorageUploadError("Upload failed", "UNKNOWN", error);
}
