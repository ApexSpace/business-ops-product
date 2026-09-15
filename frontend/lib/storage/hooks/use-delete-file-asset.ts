"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteFileAsset } from "../api/storage.api";
import { queryKeys } from "@/lib/query/keys";

export function useDeleteFileAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileAssetId: string) => deleteFileAsset(fileAssetId),
    onSuccess: async (_data, fileAssetId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.storage.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.storage.file(fileAssetId),
        }),
      ]);
    },
  });
}
