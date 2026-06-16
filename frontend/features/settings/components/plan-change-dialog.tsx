"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/data-display/loading-state";
import { useBusinessBillingMutation } from "@/features/settings/hooks/use-business-billing-mutation";
import { BillingOwnerRequiredDialog } from "@/features/settings/components/billing-owner-required-dialog";
import {
  getBusinessPlanOptions,
  type BusinessPlanTierOption,
} from "@/features/settings/api/business-billing.api";
import {
  PricingTablePreview,
  type PlanTierFilter,
} from "@/features/platform/components/plan-groups/pricing-table-preview";
import type { PublicPricingTier } from "@/features/platform/types/plan-group";
import { queryKeys } from "@/lib/query/keys";

import {
  getPlanDialogTitle,
  isRecoverySubscriptionStatus,
  resolvePlanChangeDirection,
  type PlanChangeDirection,
  type PlanSelectionMode,
  resolvePlanSelectionMode,
} from "@/features/settings/utils/plan-tier-position.util";

export type PlanChangeMode = PlanChangeDirection;

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PlanChangeMode;
  planSelectionMode?: PlanSelectionMode;
  subscriptionStatus?: string | null;
  billingSource?: string | null;
  isBillingRecovery?: boolean;
  showTrialLayout?: boolean;
  cancellationScheduled?: boolean;
}

function findTierOption(
  tiers: BusinessPlanTierOption[],
  slug: string,
): BusinessPlanTierOption | undefined {
  return tiers.find((tier) => tier.slug === slug);
}

function resolveChangeDirection(
  currentIndex: number,
  targetIndex: number,
): "upgrade" | "downgrade" {
  return targetIndex > currentIndex ? "upgrade" : "downgrade";
}

export function PlanChangeDialog({
  open,
  onOpenChange,
  mode = "both",
  planSelectionMode: planSelectionModeProp = "default",
  subscriptionStatus,
  billingSource,
  isBillingRecovery = false,
  showTrialLayout = false,
  cancellationScheduled = false,
}: PlanChangeDialogProps) {
  const effectivePlanSelectionMode = resolvePlanSelectionMode({
    subscriptionStatus,
    billingSource,
    isBillingRecovery:
      isBillingRecovery ||
      planSelectionModeProp === "recovery" ||
      isRecoverySubscriptionStatus(subscriptionStatus),
    showTrialLayout: showTrialLayout || planSelectionModeProp === "trial",
  });
  const effectiveChangeDirection = resolvePlanChangeDirection(
    effectivePlanSelectionMode,
    mode,
  );
  const dialogTitle = getPlanDialogTitle(
    effectivePlanSelectionMode,
    effectiveChangeDirection,
  );
  const [pendingStripeTier, setPendingStripeTier] = useState<{
    previewTier: PublicPricingTier;
    billingCycle: "MONTHLY" | "YEARLY";
  } | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.business.planOptions(),
    queryFn: getBusinessPlanOptions,
    enabled: open,
  });

  const {
    startTierCheckout,
    redirectingTierSlug,
    ownerRequiredOpen,
    setOwnerRequiredOpen,
    canManageTeam,
  } = useBusinessBillingMutation(effectivePlanSelectionMode);

  const isTrialSelection = effectivePlanSelectionMode === "trial";
  const isRecoverySelection = effectivePlanSelectionMode === "recovery";

  const tierFilter: PlanTierFilter =
    isTrialSelection || isRecoverySelection
      ? "all"
      : effectiveChangeDirection === "both"
        ? "all"
        : effectiveChangeDirection === "upgrade"
          ? "higher"
          : "lower";

  const pendingStripeDirection = useMemo(() => {
    if (!pendingStripeTier || !data) return null;
    const targetIndex = data.tiers.findIndex(
      (tier) => tier.slug === pendingStripeTier.previewTier.slug,
    );
    if (targetIndex < 0 || data.currentPlanTierIndex < 0) return null;
    return resolveChangeDirection(data.currentPlanTierIndex, targetIndex);
  }, [data, pendingStripeTier]);

  const handleSubscribeTier = (
    tier: PublicPricingTier,
    billingCycle: "MONTHLY" | "YEARLY",
  ) => {
    if (!data) return;
    const option = findTierOption(data.tiers, tier.slug);
    const isSameTier = option?.id === data.currentPlanTierId;
    if (!option || (isSameTier && !isTrialSelection && !isRecoverySelection)) {
      return;
    }

    const checkoutInput = {
      planGroupId: data.pricing.id,
      planTierId: option.id,
      billingCycle,
      tierSlug: tier.slug,
    };

    if (isTrialSelection || isRecoverySelection) {
      startTierCheckout(checkoutInput);
      return;
    }

    setPendingStripeTier({ previewTier: tier, billingCycle });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-auto max-w-[calc(100%-2rem)] overflow-hidden sm:max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 overflow-x-auto">
            {isRecoverySelection ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                Choose a paid plan to restore access to your workspace.
              </p>
            ) : null}

            {isTrialSelection ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                You are currently trialing this plan. Choose a paid plan to
                continue after your trial ends.
              </p>
            ) : null}

            {cancellationScheduled ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                Changing your plan will keep your subscription active and remove
                the scheduled cancellation.
              </p>
            ) : null}

            {isLoading ? <LoadingState variant="skeleton" rows={4} /> : null}

            {isError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  {error instanceof Error
                    ? error.message
                    : "Unable to load plan options."}
                </p>
                <button
                  type="button"
                  className="text-sm font-medium underline"
                  onClick={() => void refetch()}
                >
                  Try again
                </button>
              </div>
            ) : null}

            {data ? (
              <PricingTablePreview
                data={data.pricing}
                currentTierSlug={data.currentPlanTierSlug}
                planSelectionMode={effectivePlanSelectionMode}
                tierFilter={tierFilter}
                enableStripeCheckout
                fitContent
                showGroupHeader={false}
                subscribingTierSlug={redirectingTierSlug}
                onSubscribeTier={handleSubscribeTier}
              />
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingStripeTier}
        onOpenChange={(nextOpen) => !nextOpen && setPendingStripeTier(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Continue to checkout?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStripeTier
                ? `You will be redirected to Stripe to ${
                    isTrialSelection
                      ? "subscribe to"
                      : pendingStripeDirection === "downgrade"
                        ? "downgrade to"
                        : "upgrade to"
                  } ${pendingStripeTier.previewTier.name} (${pendingStripeTier.billingCycle === "YEARLY" ? "yearly" : "monthly"} billing).`
                : "Confirm checkout."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!redirectingTierSlug}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!!redirectingTierSlug}
              onClick={(event) => {
                event.preventDefault();
                if (!pendingStripeTier || !data) return;
                const option = findTierOption(
                  data.tiers,
                  pendingStripeTier.previewTier.slug,
                );
                if (!option) return;
                startTierCheckout({
                  planGroupId: data.pricing.id,
                  planTierId: option.id,
                  billingCycle: pendingStripeTier.billingCycle,
                  tierSlug: pendingStripeTier.previewTier.slug,
                });
                setPendingStripeTier(null);
              }}
            >
              {redirectingTierSlug ? "Redirecting to checkout…" : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BillingOwnerRequiredDialog
        open={ownerRequiredOpen}
        onOpenChange={setOwnerRequiredOpen}
        canManageTeam={canManageTeam}
      />
    </>
  );
}
