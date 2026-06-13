import type { FileCategory } from "../types/storage.types";

const DOCUMENT_EXTENSIONS = new Set([
  "doc",
  "docx",
  "txt",
  "csv",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "rtf",
]);

const DOCUMENT_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/rtf",
]);

export function getFileExtension(filename: string): string | null {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return null;
  }
  return trimmed.slice(lastDot + 1).toLowerCase();
}

export function detectFileCategory(file: File): FileCategory {
  const mimeType = (file.type || "").toLowerCase();
  const extension = getFileExtension(file.name);

  if (mimeType.startsWith("image/")) {
    return "IMAGE";
  }

  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType.startsWith("video/")) {
    return "VIDEO";
  }

  if (mimeType.startsWith("audio/")) {
    return "AUDIO";
  }

  if (DOCUMENT_MIME_TYPES.has(mimeType)) {
    return "DOCUMENT";
  }

  if (extension && DOCUMENT_EXTENSIONS.has(extension)) {
    return "DOCUMENT";
  }

  return "OTHER";
}
