import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createCustomFee,
  deleteCustomFee,
  updateCustomFee,
  type CreateCustomFeeBody,
  type UpdateCustomFeeBody,
} from "@/features/custom-fees/api/custom-fees.api";
import { invalidateCustomFees } from "@/lib/query/invalidation";

export function useCustomFeeMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (body: CreateCustomFeeBody) => createCustomFee(body),
    onSuccess: async () => {
      await invalidateCustomFees(queryClient);
      toast.success("Custom fee created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCustomFeeBody }) =>
      updateCustomFee(id, body),
    onSuccess: async () => {
      await invalidateCustomFees(queryClient);
      toast.success("Custom fee saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomFee(id),
    onSuccess: async () => {
      await invalidateCustomFees(queryClient);
      toast.success("Custom fee deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { createMutation, updateMutation, deleteMutation };
}
