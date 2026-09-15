"use client";

import { Suspense } from "react";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ResourcesSettingsScreen } from "@/features/resources/components/resources-settings-screen";

export function BusinessResourcesSettings() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <div className="w-full min-w-0">
        <ListPage
          title="Resources"
          description="Rooms, equipment, and consumables — schedules and service links."
        >
          <ResourcesSettingsScreen />
        </ListPage>
      </div>
    </Suspense>
  );
}
