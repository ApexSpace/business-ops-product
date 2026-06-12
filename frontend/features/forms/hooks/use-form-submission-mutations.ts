"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteFormSubmission } from "@/features/forms/api/forms.api";
import {
  invalidateFormLists,
  invalidateFormSubmissions,
} from "@/lib/query/invalidation";

export function useFormSubmissionMutations(formId: string) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (submissionId: string) =>
      deleteFormSubmission(formId, submissionId),
    onSuccess: async () => {
      await Promise.all([
        invalidateFormSubmissions(queryClient, formId),
        invalidateFormLists(queryClient),
      ]);
      toast.success("Submission deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { deleteMutation };
}
