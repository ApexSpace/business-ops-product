import { getFileExtension } from "./file-category.util";
import { StorageUploadError } from "./upload-error.util";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
}

export function validateFileForUpload({
  file,
  maxSizeMb,
  allowedMimeTypes,
  allowedExtensions,
}: {
  file: File;
  maxSizeMb?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}): void {
  if (maxSizeMb !== undefined) {
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new StorageUploadError(
        `File exceeds the ${maxSizeMb} MB limit (${formatFileSize(file.size)}).`,
        "VALIDATION_FAILED",
        { fileName: file.name, size: file.size, maxSizeMb },
      );
    }
  }

  if (allowedMimeTypes?.length) {
    const mimeType = file.type || "application/octet-stream";
    const normalizedAllowed = allowedMimeTypes.map((value) => value.toLowerCase());
    if (!normalizedAllowed.includes(mimeType.toLowerCase())) {
      throw new StorageUploadError(
        `File type "${mimeType}" is not allowed.`,
        "VALIDATION_FAILED",
        { fileName: file.name, mimeType, allowedMimeTypes },
      );
    }
  }

  if (allowedExtensions?.length) {
    const extension = getFileExtension(file.name);
    const normalizedAllowed = allowedExtensions.map((value) =>
      value.replace(/^\./, "").toLowerCase(),
    );

    if (!extension || !normalizedAllowed.includes(extension)) {
      throw new StorageUploadError(
        `File extension is not allowed.`,
        "VALIDATION_FAILED",
        { fileName: file.name, extension, allowedExtensions },
      );
    }
  }
}
