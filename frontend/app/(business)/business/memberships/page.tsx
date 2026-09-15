import { Suspense } from "react";
import { MembershipsWorkspace } from "@/features/memberships/components/memberships-workspace";
import { Skeleton } from "@/components/ui/skeleton";

export default function MembershipsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4">
          <Skeleton className="min-h-0 flex-1 rounded-xl" />
        </div>
      }
    >
      <MembershipsWorkspace />
    </Suspense>
  );
}
