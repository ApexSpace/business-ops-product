"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicBookingSlot } from "@/features/public-booking/schemas/public-booking";
import { formatTimeRange } from "@/features/public-booking/utils/booking-format";

interface BookingTimeSlotsProps {
  slots: PublicBookingSlot[];
  loading: boolean;
  selectedDate: string | null;
  timezone: string;
  durationMinutes: number;
  pendingSlotStart: string | null;
  accentColor: string;
  onSelectSlot: (slot: PublicBookingSlot) => void;
  onConfirmSlot: () => void;
  /** Full-height step layout without nested scroll (mobile/tablet flow). */
  fullHeight?: boolean;
}

export function BookingTimeSlots({
  slots,
  loading,
  selectedDate,
  timezone,
  durationMinutes,
  pendingSlotStart,
  accentColor,
  onSelectSlot,
  onConfirmSlot,
  fullHeight = false,
}: BookingTimeSlotsProps) {
  const visibleSlots = slots.filter((slot) => {
    if (!slot.available) return false;
    const start = Date.parse(slot.startAt);
    const end = Date.parse(slot.endAt);
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    const lengthMinutes = Math.round((end - start) / 60_000);
    return lengthMinutes === durationMinutes;
  });

  if (!selectedDate) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center px-4 text-center",
          fullHeight ? "py-6" : "h-full min-h-[280px]",
        )}
      >
        <p className="text-sm font-medium text-foreground">
          Select a date to view available times
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Times shown in your local timezone
        </p>
      </div>
    );
  }

  if (loading && slots.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col gap-2 p-3 sm:p-4",
          !fullHeight && "min-h-[280px]",
        )}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (visibleSlots.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center px-4 text-center",
          fullHeight ? "py-6" : "h-full min-h-[280px]",
        )}
      >
        <p className="text-sm font-medium">No times available</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No times available for this date. Try another day.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        fullHeight ? "" : "max-h-[min(420px,60vh)] sm:max-h-[480px]",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 p-3 sm:p-4",
          !fullHeight && "overflow-y-auto",
        )}
      >
        {visibleSlots.map((slot) => {
          const isPending = pendingSlotStart === slot.startAt;
          const slotLabel = formatTimeRange(
            slot.startAt,
            slot.endAt,
            timezone,
          );
          return (
            <div key={slot.startAt} className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => onSelectSlot(slot)}
                className={cn(
                  "min-h-11 w-full rounded-lg border px-4 py-3.5 text-sm font-semibold transition-all sm:min-h-12 sm:text-base",
                  "hover:border-[var(--booking-accent)] hover:shadow-sm active:scale-[0.99]",
                  isPending &&
                    "border-[var(--booking-accent)] ring-2 ring-[var(--booking-accent)]/30",
                )}
                style={
                  {
                    "--booking-accent": accentColor,
                    ...(isPending
                      ? {
                          borderColor: accentColor,
                          color: accentColor,
                        }
                      : {}),
                  } as React.CSSProperties
                }
              >
                {slotLabel}
              </button>
              {isPending ? (
                <Button
                  type="button"
                  className="h-11 w-full text-base font-semibold text-white"
                  style={{ backgroundColor: accentColor }}
                  onClick={onConfirmSlot}
                >
                  Confirm
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
