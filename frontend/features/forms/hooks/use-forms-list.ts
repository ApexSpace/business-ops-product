import { useQuery } from "@tanstack/react-query";
import { listForms } from "@/features/forms/api/forms.api";
import type { FormsListFilters } from "@/features/forms/types";
import { queryKeys } from "@/lib/query/keys";

export function useFormsList(filters: FormsListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.forms.list(filters),
    queryFn: () => listForms(filters),
  });
}
