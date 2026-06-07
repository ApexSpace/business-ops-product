"use client";

import { Clock, Globe, MapPin, ShieldCheck } from "lucide-react";
import type { PublicBookingCalendar } from "@/features/public-booking/schemas/public-booking";
import {
  formatDuration,
  formatLocationType,
} from "@/features/public-booking/utils/booking-format";
import { BookingTimezoneSelect } from "@/features/public-booking/components/booking-timezone-select";

interface BookingInfoPanelProps {
  calendar: PublicBookingCalendar;
  accentColor: string;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  /** Shown when user has picked a time (details / success) */
  summary?: {
    dateLabel: string;
    timeLabel: string;
  } | null;
}

export function BookingInfoPanel({
  calendar,
  accentColor,
  timezone,
  onTimezoneChange,
  summary,
}: BookingInfoPanelProps) {
  const locationLine = calendar.locationSummary
    ? calendar.locationSummary
    : formatLocationType(calendar.locationType);

  return (
    <div className="flex flex-col gap-6 p-6 sm:p-8 lg:min-h-[520px] lg:border-r lg:border-border/60">
      {calendar.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={calendar.logoUrl}
          alt=""
          className="h-10 w-auto max-w-[180px] object-contain object-left"
        />
      ) : (
        <div
          className="flex size-10 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: accentColor }}
        >
          {calendar.businessName.charAt(0).toUpperCase()}
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {calendar.businessName}
        </p>
        <h1 className="mt-1 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
          {calendar.title}
        </h1>
        {calendar.description ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {calendar.description}
          </p>
        ) : null}
      </div>

      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-3">
          <Clock
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span>{formatDuration(calendar.durationMinutes)}</span>
        </li>
        <li className="flex items-start gap-3">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span>{locationLine}</span>
        </li>
      </ul>

      {summary ? (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: `${accentColor}40`, backgroundColor: `${accentColor}08` }}
        >
          <p className="font-medium">{summary.dateLabel}</p>
          <p className="mt-0.5 text-muted-foreground">{summary.timeLabel}</p>
        </div>
      ) : null}

      <div className="mt-auto space-y-4 pt-4">
        <BookingTimezoneSelect
          value={timezone}
          onChange={onTimezoneChange}
        />
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="size-3.5 shrink-0" aria-hidden />
          Times are shown in your timezone
        </p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          Secure booking · Confirmation after scheduling
        </p>
      </div>
    </div>
  );
}
