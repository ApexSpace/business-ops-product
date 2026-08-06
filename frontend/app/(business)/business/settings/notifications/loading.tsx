import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsSettingsLoading() {
  return (
    <PageContainer>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-32 rounded-md" />
        ))}
      </div>

      <div className="mt-6 space-y-3 rounded-lg border border-border px-4 py-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
