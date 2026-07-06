"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Printer } from "lucide-react";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  getContactTimeline,
  getContactPrintAppointments,
  type ContactTimelineEvent,
  type ContactTimelineType,
} from "@/features/contacts/api/contact-workspace.api";
import { formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { queryKeys } from "@/lib/query/keys";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";
import { cn } from "@/lib/utils";

type TimelineFilter = "all" | "appointments" | "sales" | "notes" | "forms";

const FILTER_OPTIONS: { id: TimelineFilter; label: string; types?: ContactTimelineType[] }[] = [
  { id: "all", label: "All" },
  { id: "appointments", label: "Appointments", types: ["appointment"] },
  { id: "sales", label: "Sales", types: ["sale"] },
  { id: "notes", label: "Notes", types: ["note"] },
  { id: "forms", label: "Forms", types: ["form"] },
];

function timelineDotClass(
  type: ContactTimelineType,
  description?: string | null,
): "appointment" | "confirmed" | "note" | "system" {
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
      return type.replace(/_/g, " ");
  }
}

function formatTimelineEvent(
  event: ContactTimelineEvent,
  businessTimezone?: string,
) {
  const meta = `${timelineTypeLabel(event.type)} · ${formatContactCreatedAt(event.occurredAt, businessTimezone)}`;

  if (event.type === "note" && event.description?.trim()) {
    return {
      dotClass: timelineDotClass(event.type, event.description),
      noteText: `"${event.description.trim()}"`,
      meta,
    };
  }

  if (event.type === "appointment") {
    const parts = event.description?.split(" · ") ?? [];
    const action = parts[parts.length - 1]?.trim() || "scheduled";
    return {
      dotClass: timelineDotClass(event.type, event.description),
      name: event.title,
      action,
      meta,
    };
  }

  if (event.type === "contact_created") {
    return {
      dotClass: timelineDotClass(event.type, event.description),
      name: event.title,
      meta,
    };
  }

  return {
    dotClass: timelineDotClass(event.type, event.description),
    name: event.title,
    action: event.description?.trim() || undefined,
    meta,
  };
}

function openPrintWindow(contactId: string) {
  void getContactPrintAppointments(contactId).then((data) => {
    const rows = data.appointments
      .map(
        (appt) =>
          `<tr><td>${new Date(appt.startAt).toLocaleString()}</td><td>${appt.title}</td><td>${appt.serviceName ?? "—"}</td><td>${appt.providerName ?? "—"}</td><td>${appt.status}</td></tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><title>Upcoming appointments</title>
      <style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}h1{font-size:20px}</style>
      </head><body>
      <h1>${data.businessName}</h1>
      <p><strong>${data.contactLabel}</strong>${data.contactPhone ? ` · ${data.contactPhone}` : ""}${data.contactEmail ? ` · ${data.contactEmail}` : ""}</p>
      <h2>Upcoming appointments</h2>
      <table><thead><tr><th>When</th><th>Title</th><th>Service</th><th>Provider</th><th>Status</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='5'>No upcoming appointments</td></tr>"}</tbody></table>
      <p style="margin-top:16px;font-size:12px;color:#666">Generated ${new Date(data.generatedAt).toLocaleString()}</p>
      </body></html>`;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  });
}

export function ContactRecordsTimelineSection({
  contact,
  businessTimezone,
  onCreateNote,
}: ContactRecordsSectionProps) {
  const [filter, setFilter] = useState<TimelineFilter>("all");

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

  return (
    <>
      <div className="contacts-d2-toolbar">
        <div className="contacts-pillbar">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === option.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="contacts-toolbar-actions">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openPrintWindow(contact.id)}
          >
            <Printer className="size-4" />
            Print
          </Button>
          {onCreateNote ? (
            <ActionButton size="sm" onClick={onCreateNote}>
              <Plus className="size-4" />
              Add note
            </ActionButton>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <RecordListEmpty message="Loading timeline…" />
      ) : events.length === 0 ? (
        <EmptyState
          compact
          title="No activity yet"
          description="Appointments, sales, notes, and forms will appear here."
          className="py-8"
        />
      ) : (
        <div className="contacts-timeline">
          {events.map((event) => {
            const formatted = formatTimelineEvent(event, businessTimezone);
            return (
              <div key={event.id} className="contacts-t-item">
                <span
                  className={cn(
                    "contacts-t-dot",
                    formatted.dotClass === "note" && "note",
                    formatted.dotClass === "confirmed" && "confirmed",
                    formatted.dotClass === "appointment" && "appointment",
                    formatted.dotClass === "system" && "system",
                  )}
                />
                {"noteText" in formatted && formatted.noteText ? (
                  <>
                    <p className="text-sm">{formatted.noteText}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatted.meta}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">{formatted.name}</p>
                    {formatted.action ? (
                      <p className="text-sm text-muted-foreground">{formatted.action}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-muted-foreground">{formatted.meta}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
