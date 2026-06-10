"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PricingTablePreview } from "./pricing-table-preview";
import type { PublicPricing } from "@/features/platform/types/plan-group";

type PlanGroupPreviewTabProps = {
  preview?: PublicPricing;
  isLoading: boolean;
};

export function PlanGroupPreviewTab({
  preview,
  isLoading,
}: PlanGroupPreviewTabProps) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!preview) {
    return (
      <p className="text-sm text-muted-foreground">
        Preview data is not available.
      </p>
    );
  }
  return <PricingTablePreview data={preview} />;
}
