"use client";

import { Suspense } from "react";
import { PlatformBusinessDetailPage } from "@/features/platform/pages/platform-business-detail-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
      <PlatformBusinessDetailPage />
    </Suspense>
  );
}
