"use client";

import { Clock, MessageSquare, User } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { IconButton } from "@/components/ui/icon-button";
import { DateTime } from "luxon";
import { formatTimeInTimezone } from "@/features/calendars/utils/timezone";
import type {
  Appointment,
  AppointmentServiceLine,
  AppointmentUserSummary,
} from "@/features/appointments/schemas/appointment-profile";
import {
  getContactDisplayName,
  getMemberDisplayName,
} from "@/features/appointments/schemas/appointment-profile";
import { formatMoney } from "@/features/payments/utils/currencies";
import {
  APPOINTMENT_POPUP_CLIENT_CARD_CLASS,
  APPOINTMENT_POPUP_DATETIME_CELL_CLASS,
  APPOINTMENT_POPUP_DATETIME_ROW_CLASS,
} from "@/features/appointments/styles/appointment-side-popup";
import { cn } from "@/lib/utils";

const SECTION_LABEL_CLASS =
  "text-[11px] font-medium text-grey-tertiary-normal";

/** Figma detail date: "16 Jul 2026" */
function formatAppointmentPopupDate(iso: string, timezone: string): string {
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(timezone)
    .toFormat("d LLL yyyy");
}

function formatDurationMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export interface AppointmentDateTimeBarProps {
  startAt: string;
  endAt: string;
  timezone: string;
  editable?: boolean;
  startValue?: string;
  endValue?: string;
  onStartChange?: (value: string) => void;
  onEndChange?: (value: string) => void;
  onDateClick?: () => void;
  onTimeClick?: () => void;
  className?: string;
}

export function AppointmentDateTimeBar({
  startAt,
  endAt,
  timezone,
  editable = false,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  onDateClick,
  onTimeClick,
  className,
}: AppointmentDateTimeBarProps) {
  const dateLabel = formatAppointmentPopupDate(startAt, timezone);
  const timeLabel = `${formatTimeInTimezone(startAt, timezone)} – ${formatTimeInTimezone(endAt, timezone)}`;

  if (editable) {
    return (
      <div className={cn(APPOINTMENT_POPUP_DATETIME_ROW_CLASS, className)}>
        <label
          className={cn(
            APPOINTMENT_POPUP_DATETIME_CELL_CLASS,
            "cursor-text border-r border-[#BC9BF6]",
          )}
        >
          <span className="mr-1.5 shrink-0 text-[14px] font-medium text-[#7E3BED]">
            On
          </span>
          <input
            type="datetime-local"
            value={startValue ?? ""}
            onChange={(event) => onStartChange?.(event.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] font-medium text-[#7E3BED] outline-none"
          />
        </label>
        <label
          className={cn(APPOINTMENT_POPUP_DATETIME_CELL_CLASS, "cursor-text")}
        >
          <span className="mr-1.5 shrink-0 text-[14px] font-medium text-[#7E3BED]">
            Until
          </span>
          <input
            type="datetime-local"
            value={endValue ?? ""}
            onChange={(event) => onEndChange?.(event.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] font-medium text-[#7E3BED] outline-none"
          />
        </label>
      </div>
    );
  }

  return (
    <div className={cn(APPOINTMENT_POPUP_DATETIME_ROW_CLASS, className)}>
      <button
        type="button"
        onClick={onDateClick}
        className={cn(
          APPOINTMENT_POPUP_DATETIME_CELL_CLASS,
          "border-r border-[#BC9BF6]",
          onDateClick && "cursor-pointer hover:bg-[#7E3BED]/5",
          !onDateClick && "cursor-default",
        )}
      >
        <span className="truncate text-[14px] font-medium leading-none text-[#7E3BED]">
          On {dateLabel}
        </span>
      </button>
      <button
        type="button"
        onClick={onTimeClick}
        className={cn(
          APPOINTMENT_POPUP_DATETIME_CELL_CLASS,
          onTimeClick && "cursor-pointer hover:bg-[#7E3BED]/5",
          !onTimeClick && "cursor-default",
        )}
      >
        <span className="truncate text-[14px] font-medium leading-none text-[#7E3BED]">
          At {timeLabel}
        </span>
      </button>
    </div>
  );
}

export interface AppointmentClientBlockProps {
  contact: Appointment["contact"];
  guestFirstName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  pendingExpress?: boolean;
  onMessageClick?: () => void;
  className?: string;
}

export function AppointmentClientBlock({
  contact,
  guestFirstName,
  guestEmail,
  guestPhone,
  pendingExpress = false,
  onMessageClick,
  className,
}: AppointmentClientBlockProps) {
  if (!contact) {
    if (pendingExpress || guestFirstName || guestEmail) {
      const name = guestFirstName?.trim() || guestEmail?.trim() || "Guest";
      return (
        <div
          className={cn(
            "rounded-[10px] border border-dashed border-amber-500/40 bg-amber-500/[0.08] px-3.5 py-3",
            className,
          )}
        >
          <p className="text-[14px] font-semibold text-foreground">{name}</p>
          {guestEmail ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{guestEmail}</p>
          ) : null}
          {guestPhone ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{guestPhone}</p>
          ) : null}
          <p className="mt-1 text-[12px] font-medium text-amber-800 dark:text-amber-200">
            Pending Express Booking completion
          </p>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "rounded-[10px] border border-border/60 bg-muted/15 px-3.5 py-3",
          className,
        )}
      >
        <p className="text-[14px] font-semibold text-foreground">Time block</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Staff availability block
        </p>
      </div>
    );
  }

  const name = getContactDisplayName(contact);
  const phone = contact.phoneNumber?.trim();
  const email = contact.email?.trim();

  return (
    <div className={cn(APPOINTMENT_POPUP_CLIENT_CARD_CLASS, className)}>
      <div className="flex items-center gap-3">
        <ProfileAvatar
          name={name}
          className="size-11 shrink-0"
          fallbackClassName="bg-[#D1D1D1] text-[13px] font-semibold text-[#6B6B6B]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-tight text-black-secondary-normal">
            {name}
          </p>
          {email ? (
            <a
              href={`mailto:${email}`}
              className="mt-0.5 block truncate text-[12px] text-grey-tertiary-normal hover:underline"
            >
              {email}
            </a>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="mt-0.5 block truncate text-[12px] text-grey-tertiary-normal hover:underline"
            >
              {phone}
            </a>
          ) : null}
        </div>
        {onMessageClick ? (
          <IconButton
            aria-label="Message client"
            className="size-8 shrink-0 rounded-md border border-[#BC9BF6] bg-white text-[#7E3BED] shadow-none hover:bg-[#7E3BED]/10"
            onClick={onMessageClick}
          >
            <MessageSquare className="size-3.5" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

export interface AppointmentServicesListProps {
  services: AppointmentServiceLine[];
  timezone: string;
  currencyCode?: string;
  className?: string;
}

export function AppointmentServicesList({
  services,
  timezone,
  currencyCode = "USD",
  className,
}: AppointmentServicesListProps) {
  if (!services.length) return null;

  return (
    <div className={cn("space-y-3 pt-1", className)}>
      <ul className="space-y-4">
        {services.map((line) => {
          const staffName = line.assignedTo
            ? getMemberDisplayName(line.assignedTo)
            : "Unassigned";
          const lineTime = line.startAt
            ? formatTimeInTimezone(line.startAt, timezone)
            : null;
          const duration =
            line.durationMinutes ?? line.service.durationMinutes ?? null;
          const price = line.price ?? line.service.price;

          return (
            <li key={line.id} className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[14px] font-bold text-black-secondary-normal">
                  {line.service.name}
                </p>
                {price ? (
                  <p className="shrink-0 text-[14px] font-bold tabular-nums text-black-secondary-normal">
                    {formatMoney(price, currencyCode)}
                  </p>
                ) : null}
              </div>
              <p className="text-[13px] text-grey-tertiary-normal">
                with {staffName}
                {lineTime ? ` · at ${lineTime}` : ""}
                {duration ? ` for ${formatDurationMinutes(duration)}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function resolveAppointmentUpdatedBy(
  items: { action: string; actor: AppointmentUserSummary | null }[],
): string | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (
      (item.action === "appointment.updated" ||
        item.action === "appointment.status_changed") &&
      item.actor
    ) {
      return getMemberDisplayName(item.actor);
    }
  }
  return null;
}

function formatBookingDetailTimestamp(iso: string, timezone: string): string {
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone);
  const time = dt.toLocaleString({
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dt.toFormat("ccc")}, ${dt.toFormat("LLL d")} at ${time}`;
}

export interface AppointmentBookingDetailsSummaryProps {
  createdAt: string;
  updatedAt: string;
  createdBy: Appointment["createdBy"];
  updatedBy?: string | null;
  timezone: string;
  className?: string;
}

export function AppointmentBookingDetailsSummary({
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  timezone,
  className,
}: AppointmentBookingDetailsSummaryProps) {
  const bookedByLabel = createdBy
    ? getMemberDisplayName(createdBy)
    : "Unknown";
  const updatedByLabel = updatedBy ?? bookedByLabel;

  const rows = [
    {
      icon: Clock,
      label: `Booked on ${formatBookingDetailTimestamp(createdAt, timezone)}`,
    },
    {
      icon: User,
      label: `Booked by ${bookedByLabel}`,
    },
    {
      icon: Clock,
      label: `Updated on ${formatBookingDetailTimestamp(updatedAt, timezone)}`,
    },
    {
      icon: User,
      label: `Updated by ${updatedByLabel}`,
    },
  ];

  return (
    <div className={cn("pt-2", className)}>
      <p className={cn("mb-3", SECTION_LABEL_CLASS)}>Booking details</p>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center gap-3 text-[13px] text-grey-tertiary-normal"
          >
            <row.icon className="size-4 shrink-0 text-grey-tertiary-normal" />
            <span>{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
