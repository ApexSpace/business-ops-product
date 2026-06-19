"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FormSubmissionListItem } from "@/features/forms/types";
import type { FormField } from "@/features/forms/types";
import { formatFormTableDate } from "@/features/forms/utils/form-display.util";
import {
  buildFormFieldLabelMap,
  formatSubmissionEntries,
} from "@/features/forms/utils/form-submission-display.util";

interface FormSubmissionDetailDialogProps {
  submission: FormSubmissionListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields?: FormField[];
}

export function FormSubmissionDetailDialog({
  submission,
  open,
  onOpenChange,
  fields = [],
}: FormSubmissionDetailDialogProps) {
  const labelMap = buildFormFieldLabelMap(fields);
  const entries = submission
    ? formatSubmissionEntries(submission.data, labelMap)
    : [];
  const metadata = submission?.metadata ?? null;

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
                    {entry.label}
                  </dt>
                  <dd className="whitespace-pre-wrap break-words text-sm">
                    {entry.value}
                  </dd>
                </div>
              ))
            )}

            {metadata && Object.keys(metadata).length > 0 ? (
              <div className="mt-4 space-y-2 border-t pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Submission info
                </p>
                {metadata.referer ? (
                  <p className="text-xs text-muted-foreground">
                    Referrer: {String(metadata.referer)}
                  </p>
                ) : null}
                {metadata.ip ? (
                  <p className="text-xs text-muted-foreground">
                    IP: {String(metadata.ip)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </dl>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
