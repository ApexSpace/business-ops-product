"use client";

import { useState } from "react";
import { Clock3, User } from "lucide-react";
import { DateTime } from "luxon";
import { DrawerChevronIcon } from "@/components/drawer/drawer-icons";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { getMemberDisplayName } from "@/features/appointments/schemas/appointment-profile";
import { APPOINTMENT_DRAWER_BOOKING_DETAILS_TRIGGER_CLASS } from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

function formatBookingDetailTimestamp(iso: string, timezone: string): string {
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone);
  const time = dt.toLocaleString({
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dt.toFormat("ccc")}, ${dt.toFormat("LLL d")} at ${time}`;
}

export interface AppointmentBookingDetailsProps {
  createdAt: string;
  updatedAt: string;
  createdBy: Appointment["createdBy"];
  updatedBy?: string | null;
  timezone: string;
  className?: string;
  defaultOpen?: boolean;
  title?: string;
  triggerClassName?: string;
}

export function AppointmentBookingDetails({
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  timezone,
  className,
  defaultOpen = false,
  title = "Booking details",
  triggerClassName,
}: AppointmentBookingDetailsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bookedByLabel = createdBy
    ? getMemberDisplayName(createdBy)
    : "Unknown";
  const updatedByLabel = updatedBy ?? bookedByLabel;

  const rows = [
    {
      icon: Clock3,
      label: `Booked on ${formatBookingDetailTimestamp(createdAt, timezone)}`,
    },
    {
      icon: User,
      label: `Booked by ${bookedByLabel}`,
    },
    {
      icon: Clock3,
      label: `Updated on ${formatBookingDetailTimestamp(updatedAt, timezone)}`,
    },
    {
      icon: User,
      label: `Updated by ${updatedByLabel}`,
    },
  ];

  return (
    <div className={cn(className)}>
      <button
        type="button"
        className={cn(
          APPOINTMENT_DRAWER_BOOKING_DETAILS_TRIGGER_CLASS,
          triggerClassName,
        )}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className={cn("transition-transform", open && "rotate-90")}>
          <DrawerChevronIcon direction="right" />
        </span>
      </button>
      {open ? (
        <ul className="mt-3 space-y-2.5 pb-2">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center gap-3 text-[13px] text-muted-foreground"
            >
              <row.icon className="size-4 shrink-0" />
              <span>{row.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}