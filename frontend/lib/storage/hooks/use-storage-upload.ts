"use client";

import { useCallback, useState } from "react";
import { uploadFile as uploadFileService } from "../services/storage-upload.service";
import type {
  FileAsset,
  UploadFileInput,
  UploadProgressHandler,
} from "../types/storage.types";
import type { StorageUploadError } from "../utils/upload-error.util";
import { normalizeUploadError } from "../utils/upload-error.util";

type UploadProgressState = {
  loaded: number;
  total: number;
  percent: number;
};

export function useStorageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressState | null>(null);
  const [error, setError] = useState<StorageUploadError | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  const uploadFile = useCallback(
    async (input: UploadFileInput): Promise<FileAsset> => {
      setIsUploading(true);
      setProgress(null);
      setError(null);

      const handleProgress: UploadProgressHandler = (nextProgress) => {
        setProgress(nextProgress);
        input.onProgress?.(nextProgress);
      };

      try {
        const asset = await uploadFileService({
          ...input,
          onProgress: handleProgress,
        });
        setProgress(null);
        return asset;
      } catch (err) {
        const normalized = normalizeUploadError(err);
        setError(normalized);
        throw normalized;
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  return {
    uploadFile,
    isUploading,
    progress,
    error,
    reset,
  };
}
