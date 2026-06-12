"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FormSubmissionListItem } from "@/features/forms/types";
import { formatFormTableDate } from "@/features/forms/utils/form-display.util";
import { formatSubmissionEntries } from "@/features/forms/utils/form-submission-display.util";

interface FormSubmissionDetailDialogProps {
  submission: FormSubmissionListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormSubmissionDetailDialog({
  submission,
  open,
  onOpenChange,
}: FormSubmissionDetailDialogProps) {
  const entries = submission ? formatSubmissionEntries(submission.data) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission details</DialogTitle>
          <DialogDescription>
            {submission
              ? `Submitted ${formatFormTableDate(submission.createdAt)}`
              : "Review submitted field values."}
          </DialogDescription>
        </DialogHeader>

        {submission ? (
          <dl className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No field data.</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.key} className="space-y-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {entry.key}
                  </dt>
                  <dd className="whitespace-pre-wrap break-words text-sm">
                    {entry.value}
                  </dd>
                </div>
              ))
            )}
          </dl>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
