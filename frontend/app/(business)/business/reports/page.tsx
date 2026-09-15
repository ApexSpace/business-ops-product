import { Suspense } from "react";
import { ReportsPage } from "@/features/reports/pages/reports-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4">
          <Skeleton className="min-h-0 flex-1 rounded-xl" />
        </div>
      }
    >
      <ReportsPage />
    </Suspense>
  );
}
