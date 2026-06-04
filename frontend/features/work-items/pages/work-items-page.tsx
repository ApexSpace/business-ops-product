"use client";

import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { WorkItemsPageContent } from "@/features/work-items/components/work-items-page-content";

export function WorkItemsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <WorkItemsPageContent />
    </Suspense>
  );
}
