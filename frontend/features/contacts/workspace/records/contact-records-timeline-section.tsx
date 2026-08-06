"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/data-display/empty-state";
import { EntityDetailLinkFilter } from "@/components/layout/entity-detail-link-filter";
import {
  EntityDetailTimeline,
  type EntityDetailTimelineItem,
} from "@/components/layout/entity-detail-timeline";
import { IconButton } from "@/components/ui/icon-button";
import {
  getContactTimeline,
  type ContactTimelineEvent,
  type ContactTimelineType,
} from "@/features/contacts/api/contact-workspace.api";
import { formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { getNote } from "@/features/notes/api/notes.api";
import { queryKeys } from "@/lib/query/keys";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

type TimelineFilter = "all" | "appointments" | "sales" | "notes" | "forms";

const FILTER_OPTIONS: {
  id: TimelineFilter;
  label: string;
  types?: ContactTimelineType[];
}[] = [
  { id: "all", label: "All" },
  { id: "appointments", label: "Appointments", types: ["appointment"] },
  { id: "sales", label: "Sales", types: ["sale"] },
  { id: "notes", label: "Notes", types: ["note"] },
  { id: "forms", label: "Forms", types: ["form"] },
];

const LINK_FILTER_OPTIONS = FILTER_OPTIONS.map((option) => ({
  value: option.id,
  label: option.label,
}));

function timelineDotVariant(
  type: ContactTimelineType,
  description?: string | null,
): EntityDetailTimelineItem["dotVariant"] {
  if (type === "note") return "note";
  if (type === "contact_created") return "system";
  if (type === "appointment") {
    const desc = (description ?? "").toLowerCase();
    if (
      desc.includes("confirm") ||
      desc.includes("completed") ||
      desc.includes("complete") ||
      desc.includes("done") ||
      desc.includes("checked in") ||
      desc.includes("checked_in")
    ) {
      return "confirmed";
    }
    return "appointment";
  }
  return "system";
}

function timelineTypeLabel(type: ContactTimelineType) {
  switch (type) {
    case "contact_created":
      return "Contact";
    case "appointment":
      return "Appointment";
    case "note":
      return "Note";
    case "sale":
      return "Sale";
    case "form":
      return "Form";
    case "lead":
      return "Lead";
    case "work_item":
      return "Work item";
    case "task":
      return "Task";
    default:
      return String(type).replace(/_/g, " ");
  }
}

function toTimelineItem(
  event: ContactTimelineEvent,
  businessTimezone: string | undefined,
  noteActions: React.ReactNode | undefined,
): EntityDetailTimelineItem {
  const meta = `${timelineTypeLabel(event.type)} · ${formatContactCreatedAt(event.occurredAt, businessTimezone)}`;
  const dotVariant = timelineDotVariant(event.type, event.description);

  if (event.type === "note" && event.description?.trim()) {
    return {
      id: event.id,
      title: event.description.trim(),
      meta,
      dotVariant,
      actions: noteActions,
    };
  }

  if (event.type === "appointment") {
    const parts = event.description?.split(" · ") ?? [];
    const action = parts[parts.length - 1]?.trim() || "scheduled";
    return {
      id: event.id,
      title: event.title,
      subtitle: action,
      meta,
      dotVariant,
    };
  }

  return {
    id: event.id,
    title: event.title,
    subtitle: event.description?.trim() || undefined,
    meta,
    dotVariant,
  };
}

export function ContactRecordsTimelineSection({
  contact,
  businessTimezone,
  notes,
  onEditNote,
  onDeleteNote,
}: ContactRecordsSectionProps) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [loadingNoteId, setLoadingNoteId] = useState<string | null>(null);

  const types = useMemo(
    () => FILTER_OPTIONS.find((f) => f.id === filter)?.types,
    [filter],
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.contacts.timeline(contact.id, { types, page: 1, limit: 100 }),
    queryFn: () =>
      getContactTimeline(contact.id, { types, page: 1, limit: 100 }),
  });

  const events = data?.items ?? [];

  async function handleEditNote(entityId: string) {
    const cached = notes.find((note) => note.id === entityId);
    if (cached) {
      onEditNote(cached);
      return;
    }

    setLoadingNoteId(entityId);
    try {
      const note = await getNote(entityId);
      onEditNote(note);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not open note",
      );
    } finally {
      setLoadingNoteId(null);
    }
  }

  const timelineItems = useMemo(
    () =>
      events.map((event) => {
        const noteActions =
          event.type === "note" ? (
            <>
              <IconButton
                aria-label="Edit note"
                className="size-7"
                disabled={loadingNoteId === event.entityId}
                onClick={() => void handleEditNote(event.entityId)}
              >
                <Pencil className="size-3.5" />
              </IconButton>
              <IconButton
                aria-label="Delete note"
                className="size-7 text-destructive"
                onClick={() => onDeleteNote(event.entityId)}
              >
                <Trash2 className="size-3.5" />
              </IconButton>
            </>
          ) : undefined;

        return toTimelineItem(event, businessTimezone, noteActions);
      }),
    // handleEditNote closes over notes/onEditNote; include deps used inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable callbacks from parent
    [events, businessTimezone, loadingNoteId, notes, onEditNote, onDeleteNote],
  );

  return (
    <div className="contacts-drawer-timeline">
      <div className="contacts-drawer-records-filter">
        <EntityDetailLinkFilter
          options={LINK_FILTER_OPTIONS}
          value={filter}
          onChange={(value) => setFilter(value as TimelineFilter)}
        />
      </div>

      <div className="contacts-drawer-tab-scroll !pt-3">
        {isLoading ? (
          <RecordListEmpty message="Loading timeline…" />
        ) : timelineItems.length === 0 ? (
          <EmptyState
            compact
            title="No activity yet"
            description="Appointments, sales, notes, and forms will appear here."
            className="py-6"
          />
        ) : (
          <EntityDetailTimeline items={timelineItems} />
        )}
      </div>
    </div>
  );
}
