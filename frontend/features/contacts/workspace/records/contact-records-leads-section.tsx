"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { IconButton } from "@/components/ui/icon-button";
import { formatLeadValue, getLeadDisplayTitle } from "@/features/leads/utils/leads";
import { RecordListEmpty, RecordListItem } from "@/features/contacts/components/contact-workspace/contact-record-section";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

export function ContactRecordsLeadsSection({
  leads,
  leadsLoading,
  canDeleteLead,
  onCreateLead,
  onEditLead,
  onDeleteLead,
}: ContactRecordsSectionProps) {
  if (leadsLoading) return <RecordListEmpty message="Loading…" />;
  if (leads.length === 0) {
    return (
      <EmptyState
        compact
        title="No opportunities yet"
        description="Add a lead to track this contact through your pipeline."
        action={
          <ActionButton onClick={onCreateLead}>
            <Plus className="mr-1.5 size-4" />
            Add lead
          </ActionButton>
        }
        className="py-8"
      />
    );
  }
  return (
    <ul className="space-y-2">
      {leads.map((lead) => (
        <li key={lead.id}>
          <RecordListItem
            title={getLeadDisplayTitle(lead)}
            meta={`${lead.pipelineStage.name} · ${formatLeadValue(lead.value)}`}
            onClick={() => onEditLead(lead)}
            actions={
              <>
                <IconButton
                  aria-label="Edit lead"
                  className="size-7"
                  onClick={() => onEditLead(lead)}
                >
                  <Pencil className="size-3.5" />
                </IconButton>
                {canDeleteLead ? (
                  <IconButton
                    aria-label="Delete lead"
                    className="size-7 text-destructive"
                    onClick={() => onDeleteLead(lead.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                ) : null}
              </>
            }
          />
        </li>
      ))}
    </ul>
  );
}
