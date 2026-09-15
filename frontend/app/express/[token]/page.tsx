"use client";

import { ExpressBookingPage } from "@/features/express-booking/components/express-booking-page";

export default function ExpressPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return <ExpressBookingPage params={params} />;
}
