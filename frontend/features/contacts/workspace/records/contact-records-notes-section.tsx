"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { RichTextPreview } from "@/components/forms/rich-text-editor";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { IconButton } from "@/components/ui/icon-button";
import { formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import { RecordListEmpty, RecordListItem } from "@/features/contacts/components/contact-workspace/contact-record-section";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

export function ContactRecordsNotesSection({
  notes,
  notesLoading,
  businessTimezone,
  onCreateNote,
  onEditNote,
  onDeleteNote,
}: ContactRecordsSectionProps) {
  if (notesLoading) return <RecordListEmpty message="Loading…" />;
  if (notes.length === 0) {
    return (
      <EmptyState
        compact
        title="No notes yet"
        description="Capture context and details for this contact."
        action={
          <ActionButton onClick={onCreateNote}>
            <Plus className="mr-1.5 size-4" />
            Add note
          </ActionButton>
        }
        className="py-8"
      />
    );
  }
  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <li key={note.id}>
          <RecordListItem
            title={note.title}
            meta={`Updated ${formatContactCreatedAt(note.updatedAt, businessTimezone)}`}
            onClick={() => onEditNote(note)}
            actions={
              <>
                <IconButton
                  aria-label="Edit note"
                  className="size-7"
                  onClick={() => onEditNote(note)}
                >
                  <Pencil className="size-3.5" />
                </IconButton>
                <IconButton
                  aria-label="Delete note"
                  className="size-7 text-destructive"
                  onClick={() => onDeleteNote(note.id)}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </>
            }
          />
          <div className="mt-1 px-1">
            <RichTextPreview
              html={note.description}
              className="line-clamp-3 text-xs"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
