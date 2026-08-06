"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createPinterestBoard,
  type CreatePinterestBoardInput,
} from "@/features/social-planner/api/pinterest-boards.api";
import { queryKeys } from "@/lib/query/keys";

export function useCreatePinterestBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePinterestBoardInput) =>
      createPinterestBoard(input),
    onSuccess: async (board) => {
      toast.success(`Board “${board.name}” created`);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.businessResources("pinterest", "business"),
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
