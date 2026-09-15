"use client";

import { Suspense } from "react";
import PublicBookingRoutePage from "@/features/public-booking/components/public-booking-page";

export default function BookingAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <PublicBookingRoutePage params={params} />
    </Suspense>
  );
}
