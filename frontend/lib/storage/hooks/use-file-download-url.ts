"use client";

import { useQuery } from "@tanstack/react-query";
import { getFileDownloadUrl } from "../api/storage.api";
import { queryKeys } from "@/lib/query/keys";

export function useFileDownloadUrl(
  fileAssetId: string,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: queryKeys.storage.file(fileAssetId),
    queryFn: () => getFileDownloadUrl(fileAssetId),
    enabled: enabled && !!fileAssetId,
  });
}
