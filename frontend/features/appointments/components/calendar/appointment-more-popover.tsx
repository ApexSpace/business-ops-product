"use client";

import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatAppointmentRange,
  getAppointmentServiceSummaryLabel,
  getAppointmentStatusDisplayLabel,
  getContactDisplayName,
  type Appointment,
} from "@/features/appointments/schemas/appointment-profile";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import { resolveTimezoneForAppointment } from "@/features/calendars/utils/timezone";
import {
  getAppointmentStatusBadgeClass,
  getAppointmentStatusDotClass,
} from "@/features/appointments/utils/appointment-calendar-styles";
import { cn } from "@/lib/utils";

interface AppointmentMorePopoverProps {
  appointments: Appointment[];
  calendars?: Calendar[];
  businessTimezone?: string | null;
  /** When set, render every time label in this timezone (matches the grid axis). */
  timezone?: string;
  label: string;
  title?: string;
  onAppointmentClick: (appointment: Appointment) => void;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}

export function AppointmentMorePopover({
  appointments,
  calendars,
  businessTimezone,
  timezone,
  label,
  title = "Appointments",
  onAppointmentClick,
  triggerClassName,
  align = "start",
  side = "bottom",
}: AppointmentMorePopoverProps) {
  if (appointments.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className={cn(
          "w-full truncate rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-left text-[11px] font-medium text-primary shadow-elevation-xs transition-colors hover:bg-primary/15",
          triggerClassName,
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {label}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="max-h-80 w-80 overflow-y-auto p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <PopoverHeader className="border-b border-border/60 px-3 py-2">
          <PopoverTitle className="text-sm">{title}</PopoverTitle>
          <p className="text-xs text-muted-foreground">
            {appointments.length} appointment{appointments.length === 1 ? "" : "s"}
          </p>
        </PopoverHeader>
        <ul className="divide-y divide-border/60">
          {appointments.map((apt) => {
            const tz =
              timezone ??
              resolveTimezoneForAppointment(
                apt.calendarId,
                calendars,
                businessTimezone,
              );
            const contactName = getContactDisplayName(apt.contact);
            const clientLabel = contactName || apt.title;
            const serviceLabel = getAppointmentServiceSummaryLabel(apt);

            return (
              <li key={apt.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                  onClick={() => onAppointmentClick(apt)}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                      {clientLabel}
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-[10px] font-medium",
                        getAppointmentStatusBadgeClass(apt.status),
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          getAppointmentStatusDotClass(apt.status),
                        )}
                        aria-hidden
                      />
                      {getAppointmentStatusDisplayLabel(
                        apt.status,
                        apt.relatedCheckoutId ?? null,
                        apt.relatedCheckoutStatus ?? null,
                      )}
                    </span>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {formatAppointmentRange(apt.startAt, apt.endAt, tz)}
                  </span>

                  {serviceLabel ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {serviceLabel}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
