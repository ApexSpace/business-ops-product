import { Suspense } from "react";
import { PackagesWorkspace } from "@/features/packages/components/packages-workspace";
import { Skeleton } from "@/components/ui/skeleton";

export default function PackagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4">
          <Skeleton className="min-h-0 flex-1 rounded-xl" />
        </div>
      }
    >
      <PackagesWorkspace />
    </Suspense>
  );
}
