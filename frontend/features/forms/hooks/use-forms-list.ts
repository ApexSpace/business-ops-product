import { useQuery } from "@tanstack/react-query";
import { listForms } from "@/features/forms/api/forms.api";
import { useFormsHost } from "@/features/forms/forms-host-context";
import type { FormsListFilters } from "@/features/forms/types";
import { queryKeys } from "@/lib/query/keys";

export function useFormsList(filters: FormsListFilters = {}) {
  const { apiBase } = useFormsHost();
  return useQuery({
    queryKey: queryKeys.forms.list(apiBase, filters),
    queryFn: () => listForms(filters, apiBase),
  });
}
