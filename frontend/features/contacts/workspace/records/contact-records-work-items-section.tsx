"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { IconButton } from "@/components/ui/icon-button";
import { formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import { formatWorkItemStatus } from "@/features/work-items/schemas/work-item-profile";
import { RecordListEmpty, RecordListItem } from "@/features/contacts/components/contact-workspace/contact-record-section";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

export function ContactRecordsWorkItemsSection({
  labels,
  workItems,
  workItemsLoading,
  businessTimezone,
  onCreateWorkItem,
  onEditWorkItem,
  onDeleteWorkItem,
}: ContactRecordsSectionProps) {
  if (workItemsLoading) return <RecordListEmpty message="Loading…" />;
  if (workItems.length === 0) {
    return (
      <EmptyState
        compact
        title={`No ${labels.workItems.toLowerCase()} yet`}
        description="Record visits, jobs, or sessions for this contact."
        action={
          <ActionButton onClick={onCreateWorkItem}>
            <Plus className="mr-1.5 size-4" />
            Add
          </ActionButton>
        }
        className="py-8"
      />
    );
  }
  return (
    <ul className="space-y-2">
      {workItems.map((item) => (
        <li key={item.id}>
          <RecordListItem
            title={item.title}
            meta={`${formatWorkItemStatus(item.status)}${item.scheduledAt ? ` · ${formatContactCreatedAt(item.scheduledAt, businessTimezone)}` : ""}`}
            onClick={() => onEditWorkItem(item)}
            actions={
              <>
                <IconButton
                  aria-label="Edit work item"
                  className="size-7"
                  onClick={() => onEditWorkItem(item)}
                >
                  <Pencil className="size-3.5" />
                </IconButton>
                <IconButton
                  aria-label="Delete work item"
                  className="size-7 text-destructive"
                  onClick={() => onDeleteWorkItem(item.id)}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </>
            }
          />
        </li>
      ))}
    </ul>
  );
}
