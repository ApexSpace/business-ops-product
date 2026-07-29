"use client";

import {
  WorkItemsHostProvider,
  BUSINESS_WORK_ITEMS_HOST,
} from "@/features/work-items/work-items-host-context";
import { WorkItemsPage } from "@/features/work-items/pages/work-items-page";

export default function Page() {
  return (
    <WorkItemsHostProvider value={BUSINESS_WORK_ITEMS_HOST}>
      <WorkItemsPage />
    </WorkItemsHostProvider>
  );
}
