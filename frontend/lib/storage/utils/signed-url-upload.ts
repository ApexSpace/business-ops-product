import type { UploadProgressHandler } from "../types/storage.types";
import { StorageUploadError } from "./upload-error.util";

export function uploadToSignedUrl({
  file,
  uploadUrl,
  onProgress,
}: {
  file: File;
  uploadUrl: string;
  onProgress?: UploadProgressHandler;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const percent =
        event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0;

      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent,
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(
        new StorageUploadError(
          `Signed upload failed with status ${xhr.status}.`,
          "SIGNED_UPLOAD_FAILED",
          { status: xhr.status, response: xhr.responseText },
        ),
      );
    };

    xhr.onerror = () => {
      reject(
        new StorageUploadError(
          "Signed upload failed due to a network error.",
          "SIGNED_UPLOAD_FAILED",
        ),
      );
    };

    xhr.onabort = () => {
      reject(
        new StorageUploadError(
          "Signed upload was aborted.",
          "SIGNED_UPLOAD_FAILED",
        ),
      );
    };

    xhr.send(file);
  });
}
