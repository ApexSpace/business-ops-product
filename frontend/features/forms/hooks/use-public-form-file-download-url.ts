"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublicFormFileDownloadUrl } from "@/features/public-forms/api/public-forms.api";

export function usePublicFormFileDownloadUrl(
  publicKey: string | undefined,
  fileAssetId: string,
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && !!publicKey && !!fileAssetId;

  return useQuery({
    queryKey: ["public-form-file", publicKey, fileAssetId],
    queryFn: () => getPublicFormFileDownloadUrl(publicKey!, fileAssetId),
    enabled,
    staleTime: 4 * 60_000,
  });
}
