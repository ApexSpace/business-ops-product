"use client";

import { ChevronLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicBookingCalendar } from "@/features/public-booking/schemas/public-booking";
import { formatDuration } from "@/features/public-booking/utils/booking-format";

export type BookingMobileStep = "date" | "time" | "details" | "success";

interface BookingMobileHeaderProps {
  calendar: PublicBookingCalendar;
  accentColor: string;
  step: BookingMobileStep;
  onBack?: () => void;
  subtitle?: string;
  /** Slot/time meta shown under the title (e.g. selected time + duration). */
  metaLabel?: string;
}

export function BookingMobileHeader({
  calendar,
  accentColor,
  step,
  onBack,
  subtitle,
  metaLabel,
}: BookingMobileHeaderProps) {
  const durationLabel = formatDuration(calendar.durationMinutes);
  const showSlotMeta = step === "details" || step === "time";

  return (
    <header className="shrink-0 border-b bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 self-center"
              onClick={onBack}
              aria-label="Go back"
            >
              <ChevronLeft className="size-4" />
            </Button>
          ) : null}

          <div className="min-w-0 flex-1 space-y-1 text-left">
            <p className="truncate text-xs font-medium leading-none text-muted-foreground">
              {calendar.businessName}
            </p>
            <h1 className="truncate text-[0.9375rem] font-semibold leading-tight">
              {subtitle ?? calendar.title}
            </h1>
            {showSlotMeta && metaLabel ? (
              <p className="truncate text-sm leading-snug text-muted-foreground">
                {metaLabel}
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5 shrink-0" aria-hidden />
                  {durationLabel}
                </span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-sm leading-snug text-muted-foreground">
                <Clock className="size-3.5 shrink-0" aria-hidden />
                {durationLabel}
              </p>
            )}
          </div>
        </div>

        {calendar.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={calendar.logoUrl}
            alt=""
            className="h-10 w-auto max-w-[80px] shrink-0 object-contain"
          />
        ) : (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          >
            {calendar.businessName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
