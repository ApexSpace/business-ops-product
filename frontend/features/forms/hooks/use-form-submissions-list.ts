import { useQuery } from "@tanstack/react-query";
import { listFormSubmissions } from "@/features/forms/api/forms.api";
import { useFormsHost } from "@/features/forms/forms-host-context";
import type { FormSubmissionsListFilters } from "@/features/forms/types";
import { queryKeys } from "@/lib/query/keys";

export function useFormSubmissionsList(
  formId: string,
  filters: FormSubmissionsListFilters = {},
) {
  const { apiBase } = useFormsHost();
  return useQuery({
    queryKey: queryKeys.forms.submissions(apiBase, formId, filters),
    queryFn: () => listFormSubmissions(formId, filters, apiBase),
    enabled: !!formId,
  });
}
