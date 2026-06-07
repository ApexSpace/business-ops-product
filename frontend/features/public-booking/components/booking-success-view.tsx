"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  PublicBookingCalendar,
  PublicBookingConfirmation,
} from "@/features/public-booking/schemas/public-booking";
import {
  formatDateLong,
  formatDuration,
  formatTimeRange,
} from "@/features/public-booking/utils/booking-format";
import {
  buildBookingDetailsText,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadIcsFile,
} from "@/features/public-booking/utils/booking-calendar-links";

interface BookingSuccessViewProps {
  calendar: PublicBookingCalendar;
  confirmation: PublicBookingConfirmation;
  customerName: string;
  accentColor: string;
  embed?: boolean;
  compact?: boolean;
}

export function BookingSuccessView({
  calendar,
  confirmation,
  customerName,
  accentColor,
  embed = false,
  compact = false,
}: BookingSuccessViewProps) {
  const [showExtras, setShowExtras] = useState(false);
  const tz = confirmation.timezone;
  const dateLabel = DateTime.fromISO(confirmation.startAt, { zone: "utc" })
    .setZone(tz)
    .toFormat("cccc, LLL d, yyyy");
  const timeLabel = formatTimeRange(
    confirmation.startAt,
    confirmation.endAt,
    tz,
  );

  const calendarEvent = useMemo(
    () => ({
      title: confirmation.title,
      description: confirmation.confirmationMessage,
      location: confirmation.locationSummary ?? undefined,
      startAt: confirmation.startAt,
      endAt: confirmation.endAt,
      timezone: tz,
    }),
    [confirmation, tz],
  );

  const detailsText = buildBookingDetailsText({
    title: confirmation.title,
    businessName: confirmation.businessName,
    dateLabel,
    timeLabel,
    timezone: tz,
    location: confirmation.locationSummary,
    customerName,
  });

  const websiteUrl = confirmation.redirectUrl ?? calendar.websiteUrl;

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(detailsText);
      toast.success("Booking details copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-lg",
        compact
          ? "overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          : "p-6 sm:p-10",
      )}
    >
      <div className="text-center">
        <div
          className={cn(
            "mx-auto flex items-center justify-center rounded-full",
            compact ? "size-12" : "size-14",
          )}
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <CheckCircle2
            className={compact ? "size-7" : "size-8"}
            style={{ color: accentColor }}
            aria-hidden
          />
        </div>
        <h2
          className={cn(
            "font-semibold tracking-tight",
            compact ? "mt-3 text-xl" : "mt-4 text-2xl",
          )}
        >
          Booking confirmed
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {confirmation.confirmationMessage}
        </p>
      </div>

      <div
        className={cn(
          "rounded-xl border bg-muted/20 text-sm",
          compact ? "mt-5 space-y-3 p-4" : "mt-8 space-y-4 p-5",
        )}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Event
          </p>
          <p className="mt-1 font-medium">{confirmation.title}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{dateLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="font-medium">{timeLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Timezone</p>
            <p className="font-medium">{tz.replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="font-medium">
              {formatDuration(calendar.durationMinutes)}
            </p>
          </div>
        </div>
        {confirmation.locationSummary ? (
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="font-medium">{confirmation.locationSummary}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs text-muted-foreground">Name</p>
          <p className="font-medium">{customerName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Host</p>
          <p className="font-medium">{confirmation.businessName}</p>
        </div>
      </div>

      <div className={cn("space-y-3", compact ? "mt-4" : "mt-6")}>
        {websiteUrl ? (
          <Button
            type="button"
            className="h-11 w-full font-semibold text-white sm:h-10"
            style={{ backgroundColor: accentColor }}
            onClick={() => {
              if (embed) {
                window.open(websiteUrl, "_top");
              } else {
                window.location.href = websiteUrl;
              }
            }}
          >
            <ExternalLink className="mr-2 size-4" />
            Back to website
          </Button>
        ) : null}

        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowExtras((open) => !open)}
            aria-expanded={showExtras}
          >
            <CalendarPlus className="size-4" />
            {showExtras ? "Hide calendar options" : "Add to calendar or copy details"}
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                showExtras && "rotate-180",
              )}
            />
          </Button>

          {showExtras ? (
            <div className="mt-2 flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-sm">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() =>
                    window.open(
                      buildGoogleCalendarUrl(calendarEvent),
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  Google
                </Button>
                <span className="text-muted-foreground/60" aria-hidden>
                  ·
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() =>
                    window.open(
                      buildOutlookCalendarUrl(calendarEvent),
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  Outlook
                </Button>
                <span className="text-muted-foreground/60" aria-hidden>
                  ·
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => downloadIcsFile(calendarEvent)}
                >
                  Apple / ICS
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground"
                onClick={() => void copyDetails()}
              >
                <Copy className="size-3.5" />
                Copy booking details
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
