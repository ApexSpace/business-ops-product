import { Suspense } from "react";
import { GiftCardsWorkspace } from "@/features/gift-cards/components/gift-cards-workspace";
import { Skeleton } from "@/components/ui/skeleton";

export default function GiftCardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4">
          <Skeleton className="min-h-0 flex-1 rounded-xl" />
        </div>
      }
    >
      <GiftCardsWorkspace />
    </Suspense>
  );
}
