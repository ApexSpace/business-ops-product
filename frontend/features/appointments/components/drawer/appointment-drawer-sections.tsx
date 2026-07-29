"use client";

import { Clock, MessageSquare, Phone, Mail, User } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { IconButton } from "@/components/ui/icon-button";
import { DateTime } from "luxon";
import {
  formatDateInTimezone,
  formatTimeInTimezone,
} from "@/features/calendars/utils/timezone";
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
import { cn } from "@/lib/utils";

const SECTION_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

const CLICKABLE_BOX_CLASS =
  "flex min-h-[52px] flex-1 flex-col justify-center rounded-[10px] border-[1.5px] border-border/80 bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/35";

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
  const dateLabel = formatDateInTimezone(startAt, timezone);
  const timeLabel = `${formatTimeInTimezone(startAt, timezone)} – ${formatTimeInTimezone(endAt, timezone)}`;

  if (editable) {
    return (
      <div className={cn("flex gap-3", className)}>
        <label className={cn(CLICKABLE_BOX_CLASS, "cursor-text")}>
          <span className={SECTION_LABEL_CLASS}>On</span>
          <input
            type="datetime-local"
            value={startValue ?? ""}
            onChange={(event) => onStartChange?.(event.target.value)}
            className="mt-1 w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-foreground outline-none"
          />
        </label>
        <label className={cn(CLICKABLE_BOX_CLASS, "cursor-text")}>
          <span className={SECTION_LABEL_CLASS}>Until</span>
          <input
            type="datetime-local"
            value={endValue ?? ""}
            onChange={(event) => onEndChange?.(event.target.value)}
            className="mt-1 w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-foreground outline-none"
          />
        </label>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", className)}>
      <button
        type="button"
        onClick={onDateClick}
        className={cn(CLICKABLE_BOX_CLASS, onDateClick && "cursor-pointer")}
      >
        <span className={SECTION_LABEL_CLASS}>On</span>
        <span className="mt-1 text-[15px] font-semibold text-foreground">
          {dateLabel}
        </span>
      </button>
      <button
        type="button"
        onClick={onTimeClick}
        className={cn(CLICKABLE_BOX_CLASS, onTimeClick && "cursor-pointer")}
      >
        <span className={SECTION_LABEL_CLASS}>At</span>
        <span className="mt-1 text-[15px] font-semibold text-foreground">
          {timeLabel}
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
    <div
      className={cn(
        "rounded-[10px] border border-border/60 bg-muted/15 px-3.5 py-3",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <ProfileAvatar
          name={name}
          className="size-10 shrink-0"
          fallbackClassName="bg-primary/10 text-[13px] font-semibold text-primary"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold leading-tight text-foreground">
                {name}
              </p>
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="mt-1 flex items-center gap-2 text-[12.5px] font-medium text-foreground/90 hover:text-foreground hover:underline"
                >
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{email}</span>
                </a>
              ) : (
                <p className="mt-1 flex items-center gap-2 text-[12.5px] text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span>no email</span>
                </p>
              )}
            </div>
            {onMessageClick ? (
              <IconButton
                aria-label="Message client"
                className="size-8 shrink-0 rounded-[8px] border border-border/70 bg-background text-muted-foreground hover:text-foreground"
                onClick={onMessageClick}
              >
                <MessageSquare className="size-3.5" />
              </IconButton>
            ) : null}
          </div>

          {phone ? (
            <a
              href={`tel:${phone}`}
              className="mt-2 flex items-center gap-2 text-[12.5px] font-medium text-foreground/90 hover:text-foreground hover:underline"
            >
              <Phone className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{phone}</span>
            </a>
          ) : null}
        </div>
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
    <div className={cn("space-y-0 border-t border-border/60 pt-5", className)}>
      <p className={cn("mb-3", SECTION_LABEL_CLASS)}>Services</p>
      <ul className="divide-y divide-border/50">
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
            <li key={line.id} className="flex gap-3 py-4 first:pt-0">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-foreground">
                  {line.service.name}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {staffName}
                  {lineTime ? ` · ${lineTime}` : ""}
                  {duration ? ` · ${formatDurationMinutes(duration)}` : ""}
                </p>
              </div>
              {price ? (
                <p className="shrink-0 text-[14px] font-semibold tabular-nums text-foreground">
                  {formatMoney(price, currencyCode)}
                </p>
              ) : null}
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
    <div className={cn("border-t border-border/60 pt-5", className)}>
      <p className={cn("mb-3", SECTION_LABEL_CLASS)}>Booking details</p>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center gap-3 text-[13px] text-foreground"
          >
            <row.icon className="size-4 shrink-0 text-muted-foreground" />
            <span>{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
