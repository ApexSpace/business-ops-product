"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { IconButton } from "@/components/ui/icon-button";
import {
  formatAppointmentRange,
  formatAppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";
import { RecordListEmpty, RecordListItem } from "@/features/contacts/components/contact-workspace/contact-record-section";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

export function ContactRecordsAppointmentsSection({
  labels,
  appointments,
  appointmentsLoading,
  businessTimezone,
  onCreateAppointment,
  onEditAppointment,
  onDeleteAppointment,
}: ContactRecordsSectionProps) {
  if (appointmentsLoading) return <RecordListEmpty message="Loading…" />;
  if (appointments.length === 0) {
    return (
      <EmptyState
        compact
        title={`No ${labels.appointments.toLowerCase()} yet`}
        description="Schedule a visit, consultation, or follow-up."
        action={
          onCreateAppointment ? (
            <ActionButton onClick={onCreateAppointment}>
              <Plus className="mr-1.5 size-4" />
              Book appointment
            </ActionButton>
          ) : undefined
        }
        className="py-8"
      />
    );
  }
  return (
    <ul className="space-y-2">
      {appointments.map((appt) => (
        <li key={appt.id}>
          <RecordListItem
            title={appt.title}
            meta={`${formatAppointmentRange(appt.startAt, appt.endAt, businessTimezone)} · ${appt.calendar.name} · ${formatAppointmentStatus(appt.status)}`}
            onClick={() => onEditAppointment?.(appt)}
            actions={
              <>
                <IconButton
                  aria-label="Edit appointment"
                  className="size-7"
                  onClick={() => onEditAppointment?.(appt)}
                >
                  <Pencil className="size-3.5" />
                </IconButton>
                {onDeleteAppointment ? (
                  <IconButton
                    aria-label="Delete appointment"
                    className="size-7 text-destructive"
                    onClick={() => onDeleteAppointment(appt.id)}
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
