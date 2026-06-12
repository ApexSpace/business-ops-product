import { useQuery } from "@tanstack/react-query";
import { getForm } from "@/features/forms/api/forms.api";
import { queryKeys } from "@/lib/query/keys";

export function useFormDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.forms.detail(id ?? ""),
    queryFn: () => getForm(id!),
    enabled: !!id,
  });
}
