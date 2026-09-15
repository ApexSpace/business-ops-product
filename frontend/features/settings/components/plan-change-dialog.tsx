"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog";
import { LoadingState } from "@/components/data-display/loading-state";
import {
  changeBusinessPlanTier,
  getBusinessPlanOptions,
  previewBusinessTierChange,
  type BusinessPlanTierOption,
} from "@/features/settings/api/business-billing.api";
import {
  PricingTablePreview,
  type PlanTierFilter,
} from "@/features/platform/components/plan-groups/pricing-table-preview";
import type { PublicPricingTier } from "@/features/platform/types/plan-group";
import { queryKeys } from "@/lib/query/keys";

export type PlanChangeMode = "upgrade" | "downgrade" | "both";

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PlanChangeMode;
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

function formatPeriodEnd(iso: string | null | undefined): string {
  if (!iso) return "the end of the current billing period";
  return new Date(iso).toLocaleDateString();
}

export function PlanChangeDialog({
  open,
  onOpenChange,
  mode,
}: PlanChangeDialogProps) {
  const queryClient = useQueryClient();
  const [pendingTier, setPendingTier] = useState<{
    option: BusinessPlanTierOption;
    previewTier: PublicPricingTier;
  } | null>(null);
  const [impactSummary, setImpactSummary] = useState<string | null>(null);
  const [impactBlocked, setImpactBlocked] = useState(false);
  const [changeRequested, setChangeRequested] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.business.planOptions(),
    queryFn: getBusinessPlanOptions,
    enabled: open,
  });

  const tierFilter: PlanTierFilter =
    mode === "both" ? "all" : mode === "upgrade" ? "higher" : "lower";

  const pendingDirection = useMemo(() => {
    if (!pendingTier || !data) return null;
    const targetIndex = data.tiers.findIndex(
      (tier) => tier.id === pendingTier.option.id,
    );
    if (targetIndex < 0 || data.currentPlanTierIndex < 0) return null;
    return resolveChangeDirection(data.currentPlanTierIndex, targetIndex);
  }, [data, pendingTier]);

  const changeMutation = useMutation({
    mutationFn: ({
      planTierId,
    }: {
      planTierId: string;
      direction: "upgrade" | "downgrade";
    }) => changeBusinessPlanTier(planTierId),
    onSuccess: (result, { direction }) => {
      setPendingTier(null);
      setChangeRequested(true);
      toast.success(
        result?.requested
          ? direction === "upgrade"
            ? "Upgrade requested — plan updates when Stripe confirms"
            : "Downgrade requested — takes effect at period end when Stripe confirms"
          : direction === "upgrade"
            ? "Tier upgraded"
            : "Tier downgraded",
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.planOptions(),
      });
      void queryClient.invalidateQueries({ queryKey: ["business", "access"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectingTierSlug = useMemo(() => {
    if (!changeMutation.isPending || !pendingTier) return null;
    return pendingTier.previewTier.slug;
  }, [changeMutation.isPending, pendingTier]);

  const handleSelectTier = (tier: PublicPricingTier) => {
    if (!data) return;
    const option = findTierOption(data.tiers, tier.slug);
    if (!option || option.id === data.currentPlanTierId) return;
    setPendingTier({ option, previewTier: tier });
    setImpactSummary(null);
    setImpactBlocked(false);
    void previewBusinessTierChange(option.id)
      .then((impact) => {
        const parts: string[] = [];
        const stripe = impact.stripe;
        if (stripe?.direction === "upgrade" && stripe.addonsRemovedImmediately.length) {
          parts.push(
            `Upgrading to ${stripe.targetTierName} includes ${stripe.addonsRemovedImmediately
              .map((a) => a.name)
              .join(", ")}, which you pay separately — it will be removed immediately.`,
          );
        }
        if (stripe?.direction === "downgrade" && stripe.addonsDroppedAtPeriodEnd.length) {
          parts.push(
            `Downgrading to ${stripe.targetTierName} removes ${stripe.addonsDroppedAtPeriodEnd
              .map((a) => a.name)
              .join(", ")} starting on ${formatPeriodEnd(stripe.currentPeriodEnd)}. You keep it until then.`,
          );
        }
        if (impact.lostDependentAddons.length) {
          parts.push(
            `You will lose: ${impact.lostDependentAddons
              .map((a) => a.name)
              .join(", ")}.`,
          );
        }
        if (impact.blocked && impact.blockReason) {
          parts.push(impact.blockReason);
        }
        setImpactSummary(parts.join(" ") || null);
        setImpactBlocked(Boolean(impact.blocked));
      })
      .catch(() => {
        setImpactSummary(null);
        setImpactBlocked(false);
      });
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setChangeRequested(false);
          onOpenChange(next);
        }}
      >
        <DialogContent className="w-auto max-w-[calc(100%-2rem)] overflow-hidden sm:max-w-[calc(100%-2rem)]">
          <DialogBody className="space-y-4 overflow-x-auto">
            {changeRequested ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                Change requested. Your plan will update when Stripe confirms —
                refresh shortly if it has not updated yet.
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
                tierFilter={tierFilter}
                interactive
                fitContent
                showGroupHeader={false}
                selectingTierSlug={selectingTierSlug}
                onSelectTier={handleSelectTier}
              />
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingTier}
        onOpenChange={(nextOpen) => !nextOpen && setPendingTier(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDirection === "upgrade"
                ? "Confirm upgrade?"
                : pendingDirection === "downgrade"
                  ? "Confirm downgrade?"
                  : "Confirm plan change?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTier
                ? `Switch to ${pendingTier.option.name}? Your workspace capabilities will update to match the selected plan.`
                : "Confirm this plan change."}
              {impactSummary ? ` ${impactSummary}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={changeMutation.isPending || impactBlocked}
              onClick={(event) => {
                event.preventDefault();
                if (!pendingTier || !data) return;
                const targetIndex = data.tiers.findIndex(
                  (tier) => tier.id === pendingTier.option.id,
                );
                const direction =
                  pendingDirection ??
                  (targetIndex >= 0 && data.currentPlanTierIndex >= 0
                    ? resolveChangeDirection(
                        data.currentPlanTierIndex,
                        targetIndex,
                      )
                    : mode === "downgrade"
                      ? "downgrade"
                      : "upgrade");
                changeMutation.mutate({
                  planTierId: pendingTier.option.id,
                  direction,
                });
              }}
            >
              {changeMutation.isPending
                ? "Requesting…"
                : pendingDirection === "upgrade"
                  ? "Upgrade"
                  : pendingDirection === "downgrade"
                    ? "Downgrade"
                    : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
