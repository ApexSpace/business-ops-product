import { useQuery } from "@tanstack/react-query";
import { getForm } from "@/features/forms/api/forms.api";
import { useFormsHost } from "@/features/forms/forms-host-context";
import { queryKeys } from "@/lib/query/keys";

export function useFormDetail(id: string | null | undefined) {
  const { apiBase } = useFormsHost();
  return useQuery({
    queryKey: queryKeys.forms.detail(apiBase, id ?? ""),
    queryFn: () => getForm(id!, apiBase),
    enabled: !!id,
  });
}
