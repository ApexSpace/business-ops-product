import { useQuery } from "@tanstack/react-query";
import { listFormSubmissions } from "@/features/forms/api/forms.api";
import type { FormSubmissionsListFilters } from "@/features/forms/types";
import { queryKeys } from "@/lib/query/keys";

export function useFormSubmissionsList(
  formId: string,
  filters: FormSubmissionsListFilters = {},
) {
  return useQuery({
    queryKey: queryKeys.forms.submissions(formId, filters),
    queryFn: () => listFormSubmissions(formId, filters),
    enabled: !!formId,
  });
}
