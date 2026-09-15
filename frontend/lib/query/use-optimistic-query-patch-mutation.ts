"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";

type OptimisticContext<TData> = {
  previous: TData | undefined;
};

export type UseOptimisticQueryPatchMutationOptions<
  TData,
  TVariables,
  TResult = TData,
> = {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TResult>;
  /** Build the next cache value from the current cache + mutation variables. */
  applyOptimistic: (previous: TData, variables: TVariables) => TData;
  /**
   * Map the server result into cache. Defaults to treating `TResult` as `TData`
   * (full-object responses). Provide this when the API returns a partial entity.
   */
  resolveData?: (
    previous: TData | undefined,
    result: TResult,
    variables: TVariables,
  ) => TData | undefined;
  /** Fire-and-forget refresh after success (do not block the optimistic UI). */
  invalidate?: (queryClient: QueryClient) => void | Promise<unknown>;
  successMessage?: string;
};

/**
 * Shared optimistic React Query mutation helper for instant-persist toggles
 * and preference patches. Updates cache in `onMutate`, rolls back on error,
 * writes server data on success, then optionally invalidates in the background.
 */
export function useOptimisticQueryPatchMutation<
  TData,
  TVariables,
  TResult = TData,
>({
  queryKey,
  mutationFn,
  applyOptimistic,
  resolveData,
  invalidate,
  successMessage,
}: UseOptimisticQueryPatchMutationOptions<TData, TVariables, TResult>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables): Promise<OptimisticContext<TData>> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TData>(queryKey);
      if (previous !== undefined) {
        queryClient.setQueryData<TData>(
          queryKey,
          applyOptimistic(previous, variables),
        );
      }
      return { previous };
    },
    onError: (err: Error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(err.message);
    },
    onSuccess: (result, variables, context) => {
      const next = resolveData
        ? resolveData(context?.previous, result, variables)
        : (result as unknown as TData);
      if (next !== undefined) {
        queryClient.setQueryData<TData>(queryKey, next);
      }
      if (successMessage) {
        toast.success(successMessage);
      }
      if (invalidate) {
        void invalidate(queryClient);
      }
    },
  });
}
