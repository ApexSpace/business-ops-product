"use client";

import { cn } from "@/lib/utils";
import type { BookingMobileStep } from "@/features/public-booking/components/booking-mobile-header";

const STEPS: BookingMobileStep[] = ["date", "time", "details", "success"];

interface BookingProgressDotsProps {
  step: BookingMobileStep;
  accentColor: string;
  className?: string;
}

export function BookingProgressDots({
  step,
  accentColor,
  className,
}: BookingProgressDotsProps) {
  const stepIndex = STEPS.indexOf(step);

  return (
    <nav
      className={cn("flex items-center justify-center gap-1.5", className)}
      aria-label="Booking progress"
    >
      {STEPS.map((s, i) => (
        <span
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i <= stepIndex ? "w-5" : "w-1.5 bg-muted",
          )}
          style={
            i <= stepIndex ? { backgroundColor: accentColor } : undefined
          }
          aria-current={s === step ? "step" : undefined}
        />
      ))}
    </nav>
  );
}
