"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Printer } from "lucide-react";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getContactTimeline,
  getContactPrintAppointments,
  type ContactTimelineType,
} from "@/features/contacts/api/contact-workspace.api";
import { formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { queryKeys } from "@/lib/query/keys";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

type TimelineFilter = "all" | "appointments" | "sales" | "notes" | "forms";

const FILTER_OPTIONS: { id: TimelineFilter; label: string; types?: ContactTimelineType[] }[] = [
  { id: "all", label: "All" },
  { id: "appointments", label: "Appointments", types: ["appointment"] },
  { id: "sales", label: "Sales", types: ["sale"] },
  { id: "notes", label: "Notes", types: ["note"] },
  { id: "forms", label: "Forms", types: ["form"] },
];

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === option.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openPrintWindow(contact.id)}
        >
          <Printer className="mr-1.5 size-3.5" />
          Print upcoming
        </Button>
      </div>

      {onCreateNote ? (
        <ActionButton size="sm" className="border border-input bg-background" onClick={onCreateNote}>
          <Plus className="mr-1 size-3.5" />
          Add note
        </ActionButton>
      ) : null}

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
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="border-b border-border/50 pb-3 text-sm last:border-0">
              <p className="font-medium leading-snug">{event.title}</p>
              {event.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {event.description}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground capitalize">
                {event.type.replace(/_/g, " ")} ·{" "}
                {formatContactCreatedAt(event.occurredAt, businessTimezone)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
