"use client";

import { Suspense } from "react";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ServicesSettingsScreen } from "@/features/services/components/settings/services-settings-screen";

export function BusinessServicesSettings() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <div className="w-full min-w-0">
        <ListPage
          title="Services"
          description="Your service catalog — categories, staff, resources, and online booking."
        >
          <ServicesSettingsScreen />
        </ListPage>
      </div>
    </Suspense>
  );
}
