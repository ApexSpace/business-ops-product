"use client";

import { Clock } from "lucide-react";
import { EmptyState } from "@/components/data-display/empty-state";
import { buildContactTimeline, formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

export function ContactRecordsActivitySection({
  contact,
  leads,
  workItems,
  notes,
  tasks,
  businessTimezone,
}: ContactRecordsSectionProps) {
  const timeline = buildContactTimeline(contact, leads, workItems, notes, tasks);
  if (timeline.length === 0) {
    return (
      <EmptyState
        compact
        title="No activity yet"
        description="Events from leads and work items will appear in this timeline."
        className="py-8"
      />
    );
  }
  return (
    <ul className="space-y-3">
      {timeline.map((event) => (
        <li key={event.id} className="flex gap-2.5 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="font-medium leading-snug">{event.title}</p>
            {event.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {event.description}
              </p>
            ) : null}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatContactCreatedAt(event.at, businessTimezone)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
