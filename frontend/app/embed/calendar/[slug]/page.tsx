"use client";

import { use } from "react";
import { PublicBookingPage } from "@/features/public-booking/components/public-booking-page";

export default function EmbedCalendarBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <PublicBookingPage slug={slug} embed />;
}
