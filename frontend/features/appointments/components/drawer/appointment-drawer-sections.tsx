"use client";

import { MessageSquare, Phone, Mail } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { IconButton } from "@/components/ui/icon-button";
import {
  formatDateInTimezone,
  formatTimeInTimezone,
} from "@/features/calendars/utils/timezone";
import type {
  Appointment,
  AppointmentActivityItem,
  AppointmentServiceLine,
} from "@/features/appointments/schemas/appointment-profile";
import {
  getContactDisplayName,
  getMemberDisplayName,
} from "@/features/appointments/schemas/appointment-profile";
import { formatMoney } from "@/features/payments/utils/currencies";
import { formatRelativeTime } from "@/lib/ui/relative-time";
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

function formatActivityAction(action: string): string {
  const labels: Record<string, string> = {
    "appointment.created": "Appointment created",
    "appointment.updated": "Appointment updated",
    "appointment.status_changed": "Status changed",
    "appointment.deleted": "Appointment deleted",
  };
  return labels[action] ?? action.replace(/\./g, " ").replace(/_/g, " ");
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
  timezone: string;
  onMessageClick?: () => void;
  className?: string;
}

export function AppointmentClientBlock({
  contact,
  timezone,
  onMessageClick,
  className,
}: AppointmentClientBlockProps) {
  const name = getContactDisplayName(contact);
  const clientSince = formatDateInTimezone(contact.createdAt, timezone);

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <ProfileAvatar
        name={name}
        className="size-11"
        fallbackClassName="bg-primary/10 text-sm font-medium text-primary"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-foreground">
              {name}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Client since {clientSince}
            </p>
          </div>
          {onMessageClick ? (
            <IconButton
              aria-label="Message client"
              className="size-9 shrink-0 rounded-[9px] border border-border/70"
              onClick={onMessageClick}
            >
              <MessageSquare className="size-4" />
            </IconButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AppointmentContactDetailsRows({
  contact,
  className,
}: {
  contact: Appointment["contact"];
  className?: string;
}) {
  const phone = contact.phoneNumber?.trim();
  const email = contact.email?.trim();

  if (!phone && !email) return null;

  return (
    <div className={cn("space-y-3 border-t border-border/60 pt-5", className)}>
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-3 text-[13.5px] font-medium text-foreground hover:underline"
        >
          <Phone className="size-4 shrink-0 text-muted-foreground" />
          {phone}
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-3 break-all text-[13.5px] font-medium text-foreground hover:underline"
        >
          <Mail className="size-4 shrink-0 text-muted-foreground" />
          {email}
        </a>
      ) : null}
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

export interface AppointmentBookingDetailsProps {
  items: AppointmentActivityItem[];
  isLoading?: boolean;
  className?: string;
}

export function AppointmentBookingDetails({
  items,
  isLoading = false,
  className,
}: AppointmentBookingDetailsProps) {
  return (
    <div className={cn("border-t border-border/60 pt-5", className)}>
      <p className={cn("mb-3", SECTION_LABEL_CLASS)}>Booking details</p>
      {isLoading ? (
        <p className="text-[13px] text-muted-foreground">Loading activity…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No activity yet</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const actorLabel = item.actor
              ? getMemberDisplayName(item.actor)
              : "System";
            return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 text-[13px]"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {formatActivityAction(item.action)}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{actorLabel}</p>
                </div>
                <time
                  dateTime={item.createdAt}
                  className="shrink-0 text-muted-foreground"
                >
                  {formatRelativeTime(item.createdAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
