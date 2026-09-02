import { useQuery } from "@tanstack/react-query";
import { listCustomFees } from "@/features/custom-fees/api/custom-fees.api";
import { queryKeys } from "@/lib/query/keys";

export function useCustomFeesList(
  filters: { page?: number; limit?: number; search?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.customFees.list(filters),
    queryFn: () => listCustomFees(filters),
    enabled,
  });
}
