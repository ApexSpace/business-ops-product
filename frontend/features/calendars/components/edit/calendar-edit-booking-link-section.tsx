"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** @deprecated Public booking is configured under Settings → Online Booking */
export function CalendarEditBookingLinkSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Public booking moved</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Online booking is now managed at the business level. Use one booking
          link for all services and staff instead of per-calendar links.
        </p>
        <Link
          href="/business/settings/online-booking"
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <ExternalLink className="mr-1.5 size-4" />
          Open Online Booking settings
        </Link>
      </CardContent>
    </Card>
  );
}
