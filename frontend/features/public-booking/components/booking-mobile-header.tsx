"use client";

import { Button } from "@/components/ui/button";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import type { PublicBookingBusiness } from "@/features/public-booking/schemas/public-booking";

export type BookingMobileStep = "date" | "time" | "details" | "success";

interface BookingMobileHeaderProps {
  business: PublicBookingBusiness;
  calendar?: PublicBookingBusiness;
  accentColor: string;
  step: BookingMobileStep;
  onBack?: () => void;
  subtitle?: string;
  /** Slot/time meta shown under the title (e.g. selected time + duration). */
  metaLabel?: string;
}

export function BookingMobileHeader({
  business,
  calendar,
  accentColor,
  step,
  onBack,
  subtitle,
  metaLabel,
}: BookingMobileHeaderProps) {
  const data = business ?? calendar!;
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
              <NavArrowIcon direction="left" size="lg" />
            </Button>
          ) : null}

          <div className="min-w-0 flex-1 space-y-1 text-left">
            <p className="truncate text-xs font-medium leading-none text-muted-foreground">
              {data.businessName}
            </p>
            <h1 className="truncate text-[0.9375rem] font-semibold leading-tight">
              {subtitle ?? data.title}
            </h1>
            {showSlotMeta && metaLabel ? (
              <p className="truncate text-sm leading-snug text-muted-foreground">
                {metaLabel}
              </p>
            ) : null}
          </div>
        </div>

        {data.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.logoUrl}
            alt=""
            className="h-10 w-auto max-w-[80px] shrink-0 object-contain"
          />
        ) : (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          >
            {data.businessName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
