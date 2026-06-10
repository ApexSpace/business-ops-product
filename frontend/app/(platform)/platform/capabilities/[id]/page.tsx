"use client";

import { Suspense } from "react";
import { PlatformCapabilityDetailPage } from "@/features/platform/pages/platform-capability-detail-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
      <PlatformCapabilityDetailPage />
    </Suspense>
  );
}
