"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { IconButton } from "@/components/ui/icon-button";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import {
  getContactTimeline,
  type ContactTimelineEvent,
  type ContactTimelineType,
} from "@/features/contacts/api/contact-workspace.api";
import { ContactInlineNoteComposer } from "@/features/contacts/components/contact-inline-note-composer";
import { ContactTimelineChipFilter } from "@/features/contacts/components/contact-timeline-chip-filter";
import {
  ContactTimelineFeed,
  type ContactTimelineCardItem,
} from "@/features/contacts/components/contact-timeline-feed";
import { formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import {
  CONTACTS_DRAWER_TAB_SCROLL_CLASS,
  CONTACTS_TIMELINE_COMPOSER_WRAP_CLASS,
  CONTACTS_TIMELINE_DATE_CLASS,
  CONTACTS_TIMELINE_FILTER_WRAP_CLASS,
  CONTACTS_TIMELINE_WRAP_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
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

const CHIP_OPTIONS = FILTER_OPTIONS.map((option) => ({
  value: option.id,
  label: option.label,
}));

function timelineTypeLabel(type: ContactTimelineType) {
  switch (type) {
    case "contact_created":
      return "Created";
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

function isClosedSale(event: ContactTimelineEvent) {
  const code = (event.statusCode ?? event.description ?? "").toLowerCase();
  return (
    code.includes("closed") ||
    code.includes("paid") ||
    code.includes("complete")
  );
}

function formatTimelineWhen(
  iso: string,
  businessTimezone: string | undefined,
  withTime: boolean,
) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      ...(withTime
        ? { hour: "numeric", minute: "2-digit" as const,
}
        : undefined),
      timeZone: businessTimezone || undefined,
    }).format(new Date(iso));
  } catch {
    return formatContactCreatedAt(iso, businessTimezone);
  }
}

function toTimelineCard(
  event: ContactTimelineEvent,
  businessTimezone: string | undefined,
  noteActions: React.ReactNode | undefined,
): ContactTimelineCardItem {
  const typeLabel = timelineTypeLabel(event.type);

  if (event.type === "sale") {
    const when = formatTimelineWhen(event.occurredAt, businessTimezone, false);
    const saleLabel = event.title?.trim() || "Sale";
    return {
      id: event.id,
      meta: `${when} · ${saleLabel}`,
      title: event.lineTitle?.trim() || saleLabel,
      amount: event.amount ?? event.total ?? undefined,
      badge: isClosedSale(event) ? { kind: "closed" } : undefined,
      moneyRows:
        event.subtotal || event.total
          ? [
              ...(event.subtotal
                ? [
                    {
                      label: "Subtotal",
                      value: event.subtotal,
                    },
                  ]
                : []),
              ...(event.total
                ? [
                    {
                      label: "Total",
                      value: event.total,
                      emphasize: true,
                      bordered: true,
                    },
                  ]
                : []),
            ]
          : undefined,
      paymentLine: event.paymentSummary ?? undefined,
      actions: noteActions,
    };
  }

  if (event.type === "appointment") {
    const when = formatTimelineWhen(event.occurredAt, businessTimezone, true);
    return {
      id: event.id,
      meta: `${when} · Appointment`,
      title: event.title,
      subtitle:
        event.subtitle?.trim() ||
        event.description
          ?.split(" · ")
          .find((p) => /^with\s+/i.test(p.trim()))
          ?.trim() ||
        undefined,
      badge: event.requested ? { kind: "requested" } : undefined,
      footer: event.footer ?? undefined,
      actions: noteActions,
    };
  }

  const when = formatContactCreatedAt(event.occurredAt, businessTimezone);
  const meta = `${when} · ${typeLabel}`;

  if (event.type === "note" && event.description?.trim()) {
    return {
      id: event.id,
      meta,
      title: event.description.trim(),
      actions: noteActions,
    };
  }

  if (event.type === "contact_created") {
    return {
      id: event.id,
      meta: `${when} · ${event.description?.trim() || "System"}`,
      title: event.title?.trim() || "Client Created",
      actions: noteActions,
    };
  }

  return {
    id: event.id,
    meta,
    title: event.title,
    subtitle: event.description?.trim() || undefined,
    actions: noteActions,
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
    queryKey: queryKeys.contacts.timeline(contact.id, {
      types,
      page: 1,
      limit: 100,
    }),
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

        return toTimelineCard(event, businessTimezone, noteActions);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable callbacks from parent
    [events, businessTimezone, loadingNoteId, notes, onEditNote, onDeleteNote],
  );

  const todayLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
        timeZone: businessTimezone || undefined,
      }).format(new Date());
    } catch {
      return new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
      }).format(new Date());
    }
  }, [businessTimezone]);

  return (
    <div className={CONTACTS_TIMELINE_WRAP_CLASS}>
      <div className={CONTACTS_TIMELINE_COMPOSER_WRAP_CLASS}>
        <button
          type="button"
          className={CONTACTS_TIMELINE_DATE_CLASS}
          aria-label={`Timeline date ${todayLabel}`}
        >
          <span>{todayLabel}</span>
          <NavArrowIcon direction="down" size="sm" className="opacity-60" />
        </button>
        <ContactInlineNoteComposer
          contactId={contact.id}
          onCancel={() => undefined}
          variant="timeline"
          showLabel={false}
        />
      </div>

      <div className={CONTACTS_TIMELINE_FILTER_WRAP_CLASS}>
        <ContactTimelineChipFilter
          options={CHIP_OPTIONS}
          value={filter}
          onChange={(value) => setFilter(value as TimelineFilter)}
        />
      </div>

      <div className={CONTACTS_DRAWER_TAB_SCROLL_CLASS}>
        {isLoading ? (
          <LoadingState variant="skeleton" rows={4} className="py-4" />
        ) : timelineItems.length === 0 ? (
          <EmptyState
            compact
            title="No activity yet"
            description="Appointments, sales, notes, and forms will appear here."
            className="py-6"
          />
        ) : (
          <ContactTimelineFeed items={timelineItems} />
        )}
      </div>
    </div>
  );
}
