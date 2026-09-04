"use client";

import { Suspense } from "react";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { TeamWorkspace } from "@/features/team/components/team-workspace";

export function BusinessTeamSettings() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <div className="w-full min-w-0">
        <ListPage
          title="Team Members"
          description="Staff profiles, permissions, services, and schedules."
        >
          <TeamWorkspace />
        </ListPage>
      </div>
    </Suspense>
  );
}
