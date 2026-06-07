"use client";

import PublicBookingRoutePage from "@/features/public-booking/components/public-booking-page";

export default function CalendarBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <PublicBookingRoutePage params={params} />;
}
