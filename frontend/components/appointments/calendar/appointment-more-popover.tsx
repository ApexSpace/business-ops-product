"use client";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatAppointmentRange,
  formatAppointmentStatus,
  getContactDisplayName,
  type Appointment,
} from "@/lib/appointment-profile";
import type { Calendar } from "@/lib/calendar-profile";
import { resolveTimezoneForAppointment } from "@/lib/timezone";
import { cn } from "@/lib/utils";

interface AppointmentMorePopoverProps {
  appointments: Appointment[];
  calendars?: Calendar[];
  businessTimezone?: string | null;
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
            const tz = resolveTimezoneForAppointment(
              apt.calendarId,
              calendars,
              businessTimezone,
            );
            return (
              <li key={apt.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                  onClick={() => onAppointmentClick(apt)}
                >
                  <span className="truncate font-medium text-sm">{apt.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatAppointmentRange(apt.startAt, apt.endAt, tz)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {getContactDisplayName(apt.contact)}
                    {apt.service ? ` · ${apt.service.name}` : ""}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <Badge variant="outline" className="h-5 text-[10px] font-normal">
                      {formatAppointmentStatus(apt.status)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {apt.calendar.name}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
