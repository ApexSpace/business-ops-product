"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { usePlanTierSubscribe } from "@/features/platform/hooks/use-plan-tier-subscribe";
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

  return (
    <PlanGroupPreviewPricingTable preview={preview} />
  );
}

function PlanGroupPreviewPricingTable({ preview }: { preview: PublicPricing }) {
  const { subscribe, subscribingTierSlug } = usePlanTierSubscribe(preview.id);

  return (
    <PricingTablePreview
      data={preview}
      enableStripeCheckout
      onSubscribeTier={subscribe}
      subscribingTierSlug={subscribingTierSlug}
      stripeCheckoutBlockedMessage="Sign in to subscribe to this plan."
    />
  );
}
