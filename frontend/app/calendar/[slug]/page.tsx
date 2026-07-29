"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

/** @deprecated Redirect legacy /calendar/:slug to /book/:slug */
export default function LegacyCalendarBookingRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/book/${encodeURIComponent(slug)}`);
  }, [router, slug]);

  return null;
}
