"use client";

import type { PublicBookingSlot } from "@/features/public-booking/schemas/public-booking";

interface BookingWaitlistSuccessProps {
  businessName: string;
  dateLabel: string;
  serviceLabel: string;
  staffLabel?: string;
}

export function BookingWaitlistSuccess({
  businessName,
  dateLabel,
  serviceLabel,
  staffLabel,
}: BookingWaitlistSuccessProps) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <h2 className="text-2xl font-semibold">You&apos;re on the waitlist!</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        We&apos;ll get in touch when an opening becomes available.
      </p>
      <div className="mt-8 space-y-2">
        <p className="text-sm">{dateLabel}</p>
        <p className="text-base font-semibold">{serviceLabel}</p>
        {staffLabel ? (
          <p className="text-sm text-muted-foreground">with {staffLabel}</p>
        ) : null}
      </div>
      <p className="mt-10 max-w-md text-xs text-muted-foreground">
        Have a question for {businessName}? Don&apos;t hesitate to call or email us.
      </p>
    </div>
  );
}

export type { PublicBookingSlot };
