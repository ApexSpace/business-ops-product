"use client";

import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { TasksPageContent } from "@/features/tasks/components/tasks-page-content";

export function TasksPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <TasksPageContent />
    </Suspense>
  );
}
