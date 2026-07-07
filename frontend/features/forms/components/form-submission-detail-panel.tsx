"use client";

import {
  EntityDetailField,
  EntityDetailSection,
} from "@/components/layout/entity-detail-section";
import type { FormSubmissionListItem } from "@/features/forms/types";
import type { FormField } from "@/features/forms/types";
import { formatFormTableDate } from "@/features/forms/utils/form-display.util";
import {
  buildFormFieldLabelMap,
  formatSubmissionEntries,
} from "@/features/forms/utils/form-submission-display.util";

interface FormSubmissionDetailPanelProps {
  submission: FormSubmissionListItem;
  fields?: FormField[];
}

export function FormSubmissionDetailPanel({
  submission,
  fields = [],
}: FormSubmissionDetailPanelProps) {
  const labelMap = buildFormFieldLabelMap(fields);
  const entries = formatSubmissionEntries(submission.data, labelMap);
  const metadata = submission.metadata ?? null;

  return (
    <EntityDetailSection title="Responses">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No field data.</p>
      ) : (
        <dl className="space-y-4">
          {entries.map((entry) => (
            <EntityDetailField key={entry.key} label={entry.label}>
              <span className="whitespace-pre-wrap break-words">
                {entry.value}
              </span>
            </EntityDetailField>
          ))}
        </dl>
      )}

      {metadata && Object.keys(metadata).length > 0 ? (
        <EntityDetailSection title="Submission info" className="mt-6">
          {metadata.referer ? (
            <EntityDetailField label="Referrer">
              {String(metadata.referer)}
            </EntityDetailField>
          ) : null}
          {metadata.ip ? (
            <EntityDetailField label="IP address">
              {String(metadata.ip)}
            </EntityDetailField>
          ) : null}
        </EntityDetailSection>
      ) : null}
    </EntityDetailSection>
  );
}

export function formSubmissionDrawerSubtitle(
  submission: FormSubmissionListItem,
): string {
  return `Submitted ${formatFormTableDate(submission.createdAt)}`;
}
