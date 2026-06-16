"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, CreditCard, ExternalLink } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import {
  BusinessBillingTabs,
  type BusinessBillingTab,
} from "@/features/settings/components/business-billing-tabs";
import { useAuth } from "@/lib/auth/provider";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { useBusinessAccess } from "@/lib/business-access/use-business-access";
import { isBillingRecoveryState } from "@/lib/business-access/billing-recovery";
import { getAccessBlockedMessage } from "@/components/business-access/business-access-messages";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  cancelBusinessSubscription,
  createBusinessPortalSession,
  getBusinessPlanOptions,
  resumeBusinessSubscription,
} from "@/features/settings/api/business-billing.api";
import { useBusinessBillingMutation } from "@/features/settings/hooks/use-business-billing-mutation";
import { getPublicPlanPricing } from "@/features/platform/api/plan-groups.api";
import {
  PlanChangeDialog,
  type PlanChangeMode,
} from "@/features/settings/components/plan-change-dialog";
import { BillingOwnerRequiredDialog } from "@/features/settings/components/billing-owner-required-dialog";
import { BusinessBillingInvoicesTab } from "@/features/settings/components/business-billing-invoices-tab";
import {
  resolveBillingPeriodEndField,
  resolveScheduledCancelDate,
} from "@/features/settings/utils/billing-period-display.util";
import {
  canChangePlanBothWays,
  canDowngrade,
  canUpgrade,
  getPlanChangeButtonLabel,
  getTierPosition,
  isCanceledOrExpiredSubscription,
  isCancellationScheduled,
  resolvePlanSelectionMode,
} from "@/features/settings/utils/plan-tier-position.util";
import { queryKeys } from "@/lib/query/keys";
import { invalidateBusinessBilling } from "@/lib/query/invalidation";
import type { PublicPricingTier } from "@/features/platform/types/plan-group";

function isTierStripeCheckoutReady(
  tier: PublicPricingTier,
  billingCycle: "MONTHLY" | "YEARLY",
): boolean {
  if (billingCycle === "MONTHLY") {
    return Boolean(tier.stripeMonthlyEnabled ?? tier.stripeCheckoutEnabled);
  }
  return Boolean(tier.stripeYearlyEnabled ?? tier.stripeCheckoutEnabled);
}

function formatLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBillingSource(value?: string | null): string {
  if (value === "STRIPE") return "Stripe managed";
  if (value === "MANUAL") return "Manual billing";
  if (value === "INTERNAL") return "Internal / free";
  if (value === "NOT_SELECTED") return "Not selected";
  return formatLabel(value);
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function formatDaysRemaining(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function formatPaymentMethodCustomer(value?: string | null): string {
  if (!value || value === "NOT_SELECTED") return "No payment method on file";
  if (value === "STRIPE") return "Stripe";
  return formatLabel(value);
}

function formatPaymentStatusCustomer(value?: string | null): string {
  if (!value || value === "NOT_REQUIRED") return "Not required";
  return formatLabel(value);
}

export function BusinessBillingSettings() {
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const { access, isLoading, refetch: refetchAccess, isBillingRecovery: accessBillingRecovery, supportContact } = useBusinessAccess();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planChangeDirection, setPlanChangeDirection] =
    useState<PlanChangeMode>("both");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [billingTab, setBillingTab] = useState<BusinessBillingTab>("overview");
  const subscribeIntentHandled = useRef(false);

  const subscribePlanTierId = searchParams.get("subscribePlanTierId");
  const subscribePlanGroupId = searchParams.get("subscribePlanGroupId");
  const hasSubscribeIntent = Boolean(subscribePlanTierId);

  const isBillingRecovery = Boolean(
    access && (accessBillingRecovery || isBillingRecoveryState(access)),
  );

  const hasPlanGroup =
    Boolean(access?.subscription?.planGroupId) || isBillingRecovery;
  const isStripeBilling = access?.subscription?.billingSource === "STRIPE";

  const { data: planOptions } = useQuery({
    queryKey: queryKeys.business.planOptions(),
    queryFn: getBusinessPlanOptions,
    enabled: hasPlanGroup,
  });

  const needsSubscribePricing =
    hasSubscribeIntent &&
    Boolean(subscribePlanGroupId) &&
    !access?.subscription?.planGroupId;

  const { data: subscribePricing, isLoading: subscribePricingLoading } =
    useQuery({
      queryKey: ["public-pricing", subscribePlanGroupId],
      queryFn: () => getPublicPlanPricing(subscribePlanGroupId!),
      enabled: needsSubscribePricing && !isLoading,
    });

  const tierPosition = useMemo(
    () =>
      getTierPosition(
        planOptions?.currentPlanTierIndex ?? -1,
        planOptions?.tiers.length ?? 0,
      ),
    [planOptions?.currentPlanTierIndex, planOptions?.tiers.length],
  );

  const planChangeLabel = getPlanChangeButtonLabel(tierPosition, {
    cancellationScheduled: isCancellationScheduled({
      billingSource: access?.subscription?.billingSource,
      subscriptionStatus: access?.subscription?.status,
      cancelAtPeriodEnd: access?.subscription?.cancelAtPeriodEnd,
    }),
  });
  const subscriptionStatus = access?.subscription?.status?.toUpperCase();
  const billingSource = access?.subscription?.billingSource;
  const isInternalBilling = billingSource === "INTERNAL";
  const isManualBilling = billingSource === "MANUAL";
  const isTrialing = subscriptionStatus === "TRIALING";
  const isTrialExpired = access?.reasonCode === "TRIAL_EXPIRED";
  const showTrialLayout =
    (isTrialing || isTrialExpired) &&
    !isStripeBilling &&
    !isInternalBilling &&
    !isManualBilling;
  const isCanceledOrExpired = isCanceledOrExpiredSubscription(
    subscriptionStatus,
  );
  const planSelectionMode = resolvePlanSelectionMode({
    subscriptionStatus,
    billingSource,
    isBillingRecovery,
    showTrialLayout,
  });

  const {
    startTierCheckout,
    isRedirecting,
    ownerRequiredOpen,
    setOwnerRequiredOpen,
    canManageTeam,
  } = useBusinessBillingMutation(planSelectionMode);
  const trialEnd =
    showTrialLayout || isTrialing
      ? access?.subscription?.nextBillingDate ??
        access?.subscription?.currentPeriodEnd
      : null;
  const daysRemaining =
    trialEnd != null ? daysUntil(new Date(trialEnd)) : null;
  const isActiveTrial = showTrialLayout && isTrialing && !isTrialExpired;
  const cancellationScheduled = isCancellationScheduled({
    billingSource,
    subscriptionStatus,
    cancelAtPeriodEnd: access?.subscription?.cancelAtPeriodEnd,
  });
  const scheduledCancelDate = resolveScheduledCancelDate(access?.subscription);
  const billingPeriodEndField = resolveBillingPeriodEndField({
    subscription: access?.subscription,
    showTrialLayout,
    cancellationScheduled,
  });
  const isStripeCanceledOrExpired =
    isCanceledOrExpired && billingSource === "STRIPE";
  const showSelfServicePlanChanges = planSelectionMode === "paid-stripe";
  const showBothWays =
    hasPlanGroup &&
    showSelfServicePlanChanges &&
    canChangePlanBothWays(tierPosition);
  const showUpgradeOnly =
    hasPlanGroup &&
    showSelfServicePlanChanges &&
    canUpgrade(tierPosition) &&
    !showBothWays;
  const showDowngradeOnly =
    hasPlanGroup &&
    showSelfServicePlanChanges &&
    canDowngrade(tierPosition) &&
    !showBothWays &&
    !cancellationScheduled;
  const showChangePlanAction =
    hasPlanGroup &&
    showSelfServicePlanChanges &&
    (cancellationScheduled ||
      showBothWays ||
      showUpgradeOnly ||
      showDowngradeOnly);
  const showBillingPeriodSection =
    !isBillingRecovery && !isCanceledOrExpired;
  const showCancelSubscription =
    Boolean(access?.subscription?.id) &&
    subscriptionStatus !== "CANCELED" &&
    !isBillingRecovery &&
    !isInternalBilling &&
    !isManualBilling &&
    !showTrialLayout &&
    !cancellationScheduled;

  const portalMutation = useMutation({
    mutationFn: createBusinessPortalSession,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBusinessSubscription(),
    onSuccess: async (result) => {
      setCancelOpen(false);
      await invalidateBusinessBilling(queryClient);
      refetchAccess();

      if (result.billingSource === "STRIPE") {
        const accessEnd = formatDate(
          result.currentPeriodEnd ?? scheduledCancelDate,
        );
        toast.success(
          `Cancellation scheduled. Your access remains active until ${accessEnd}.`,
        );
        return;
      }

      toast.info(
        "Your subscription has been canceled. Removing workspace access…",
      );
      await logout();
      router.push("/login?reason=subscription-canceled");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resumeMutation = useMutation({
    mutationFn: resumeBusinessSubscription,
    onSuccess: async () => {
      await invalidateBusinessBilling(queryClient);
      refetchAccess();
      toast.success("Subscription kept. Your plan will continue to renew.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!subscribePlanTierId) return;
    if (subscribeIntentHandled.current || isLoading || !access) {
      return;
    }

    const workspacePlanGroupId = access.subscription?.planGroupId;
    const subscribeDataReady = workspacePlanGroupId
      ? Boolean(planOptions)
      : Boolean(subscribePlanGroupId) &&
        Boolean(subscribePricing) &&
        !subscribePricingLoading;

    if (!subscribeDataReady) return;

    subscribeIntentHandled.current = true;

    const billingCycleParam = searchParams.get("billingCycle");
    const billingCycle =
      billingCycleParam === "YEARLY" ? "YEARLY" : "MONTHLY";

    console.debug("[plan-tier-cta]", {
      source: "business-billing-settings",
      event: "deep_link_subscribe_intent",
      subscribePlanTierId,
      subscribePlanGroupId,
      workspacePlanGroupId: workspacePlanGroupId ?? null,
      billingCycle,
    });

    if (
      subscribePlanGroupId &&
      workspacePlanGroupId &&
      subscribePlanGroupId !== workspacePlanGroupId
    ) {
      console.debug("[plan-tier-cta]", {
        source: "business-billing-settings",
        event: "deep_link_subscribe_aborted",
        reason: "plan_group_mismatch",
      });
      toast.error("This plan is not available for your workspace.");
      router.replace("/business/settings/billing");
      return;
    }

    const effectivePlanGroupId =
      workspacePlanGroupId ?? subscribePlanGroupId ?? null;

    let pricingTier: PublicPricingTier | undefined;
    if (planOptions) {
      const tierOption = planOptions.tiers.find(
        (tier) => tier.id === subscribePlanTierId,
      );
      pricingTier = planOptions.pricing.tiers.find(
        (tier) =>
          tier.planTierId === subscribePlanTierId ||
          tier.slug === tierOption?.slug,
      );
    } else if (subscribePricing) {
      pricingTier = subscribePricing.tiers.find(
        (tier) => tier.planTierId === subscribePlanTierId,
      );
    }

    router.replace("/business/settings/billing");

    if (!pricingTier || !effectivePlanGroupId) {
      console.debug("[plan-tier-cta]", {
        source: "business-billing-settings",
        event: "deep_link_subscribe_aborted",
        reason: "tier_not_found",
        hasPricingTier: Boolean(pricingTier),
        hasEffectivePlanGroupId: Boolean(effectivePlanGroupId),
      });
      toast.error("Plan tier not found.");
      return;
    }

    if (
      planOptions?.currentPlanTierId === subscribePlanTierId &&
      planSelectionMode !== "trial" &&
      planSelectionMode !== "recovery"
    ) {
      console.debug("[plan-tier-cta]", {
        source: "business-billing-settings",
        event: "deep_link_subscribe_aborted",
        reason: "already_current_tier",
      });
      return;
    }

    const stripeReady = isTierStripeCheckoutReady(pricingTier, billingCycle);
    console.debug("[plan-tier-cta]", {
      source: "business-billing-settings",
      event: stripeReady ? "deep_link_checkout_start" : "deep_link_subscribe_aborted",
      reason: stripeReady ? undefined : "stripe_not_ready",
      planGroupId: effectivePlanGroupId,
      planTierId: subscribePlanTierId,
      billingCycle,
      tierSlug: pricingTier.slug,
      isTierStripeCheckoutReady: stripeReady,
    });

    if (stripeReady) {
      startTierCheckout({
        planGroupId: effectivePlanGroupId,
        planTierId: subscribePlanTierId,
        billingCycle,
        tierSlug: pricingTier.slug,
      });
      return;
    }

    toast.error(
      "This plan is not connected to Stripe yet. Please contact support.",
    );
  }, [
    access,
    isLoading,
    planOptions,
    router,
    searchParams,
    subscribePlanGroupId,
    subscribePlanTierId,
    subscribePricing,
    subscribePricingLoading,
    planSelectionMode,
    startTierCheckout,
  ]);

  const startCheckout = () => {
    const tierId = planOptions?.currentPlanTierId;
    const planGroupId = access?.subscription?.planGroupId;
    const tierSlug = planOptions?.currentPlanTierSlug ?? tierId ?? "checkout";
    if (!tierId || !planGroupId) {
      toast.error("No plan tier is assigned to this workspace.");
      return;
    }
    startTierCheckout({
      planGroupId,
      planTierId: tierId,
      billingCycle: "MONTHLY",
      tierSlug,
    });
  };

  const handleTrialUpgrade = () => {
    if (!hasPlanGroup) {
      toast.error("No plan tier is assigned to this workspace.");
      return;
    }
    setPlanChangeDirection("both");
    setPlanDialogOpen(true);
  };

  const openPlanSelection = () => {
    setPlanChangeDirection("both");
    setPlanDialogOpen(true);
  };

  const openPlanChange = (direction: PlanChangeMode) => {
    if (planSelectionMode !== "paid-stripe") {
      openPlanSelection();
      return;
    }
    setPlanChangeDirection(direction);
    setPlanDialogOpen(true);
  };

  const formatRecoveryWarnings = (warnings: string[]): string[] =>
    warnings.map((warning) => {
      if (
        warning.includes("access is limited until you start a paid subscription") ||
        warning === "Active business with canceled subscription" ||
        warning === "Active business with expired subscription"
      ) {
        return "Your workspace is active, but access is limited until you start a paid subscription.";
      }
      return warning;
    });

  if (isLoading) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <PageHeader description="Your subscription and plan details." />
        <p className="text-sm text-muted-foreground">Loading plan details…</p>
      </div>
    );
  }

  const sub = access?.subscription;
  const blockedCopy =
    access && !access.canAccessWorkspace
      ? getAccessBlockedMessage(access.reasonCode)
      : null;
  const recoveryWarnings = formatRecoveryWarnings(access?.warnings ?? []);

  const overviewContent = isBillingRecovery ? (
    <>
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <CardHeader>
          <CardTitle className="text-base">Subscription inactive</CardTitle>
          <CardDescription>
            Your subscription is no longer active. Choose a paid plan to restore
            access to your workspace.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Previous plan</CardTitle>
            <CardDescription>
              Your last assigned package before access was limited.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Plan group</span>
                <span>{sub?.planGroupName ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Plan tier</span>
                <span>{sub?.planTierName ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary">{formatLabel(sub?.status)}</Badge>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Access</span>
                <span>{access?.canAccessWorkspace ? access.reasonLabel : "Billing required"}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              {isInternalBilling ? (
                <p className="w-full text-sm text-muted-foreground">
                  This workspace is managed internally. Contact support if access
                  is unavailable.
                </p>
              ) : isManualBilling ? (
                <ActionButton
                  size="sm"
                  onClick={() => {
                    window.location.href = `mailto:${supportContact.email}`;
                  }}
                >
                  Contact support to reactivate billing
                </ActionButton>
              ) : billingSource === "STRIPE" || billingSource === "NOT_SELECTED" || !billingSource ? (
                <>
                  <ActionButton
                    size="sm"
                    onClick={openPlanSelection}
                    disabled={isRedirecting || !hasPlanGroup}
                  >
                    <CreditCard className="mr-2 size-4" />
                    Choose a paid plan
                  </ActionButton>
                  {billingSource === "STRIPE" ? (
                    <ActionButton
                      size="sm"
                      variant="outline"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Manage billing
                    </ActionButton>
                  ) : null}
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recovery details</CardTitle>
            <CardDescription>
              What you need to do to restore workspace access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Billing status</span>
              <span>Inactive</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Previous billing source</span>
              <span>{formatBillingSource(sub?.billingSource)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Previous plan</span>
              <span>{sub?.planTierName ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Action required</span>
              <span>
                {isInternalBilling
                  ? "Contact support"
                  : isManualBilling
                    ? "Contact support to reactivate billing"
                    : "Choose a paid plan"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {recoveryWarnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {recoveryWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </>
  ) : (
    <>

      {showTrialLayout ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-base">
              {isActiveTrial ? "Trial active" : "Trial ended"}
            </CardTitle>
            <CardDescription>
              {isActiveTrial && daysRemaining != null
                ? `Your trial ends in ${formatDaysRemaining(daysRemaining)}. Upgrade to a paid plan to continue using your workspace.`
                : "Your trial has ended. Upgrade to a paid plan to restore full access."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : isInternalBilling ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Internal account</CardTitle>
            <CardDescription>
              This workspace is managed as an internal account. Billing is not
              required.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : isManualBilling ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Support-managed billing</CardTitle>
            <CardDescription>
              Billing is managed by support.
              {hasPlanGroup
                ? " Contact support to change your plan."
                : null}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : blockedCopy ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-base">{blockedCopy.title}</CardTitle>
            <CardDescription>{blockedCopy.message}</CardDescription>
          </CardHeader>
          {sub?.billingSource !== "STRIPE" ? (
            <CardContent>
              <ActionButton size="sm" onClick={startCheckout}>
                <CreditCard className="mr-2 size-4" />
                Subscribe with Stripe
              </ActionButton>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {showTrialLayout ? "Current trial" : "Current plan"}
            </CardTitle>
            <CardDescription>
              {showTrialLayout
                ? "Your trial plan and status."
                : "Package assigned to this workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Plan group</span>
                <span>{sub?.planGroupName ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Plan tier</span>
                <span>{sub?.planTierName ?? "—"}</span>
              </div>

              {showTrialLayout ? (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Trial status</span>
                    <Badge variant="secondary">
                      {isActiveTrial ? "Active" : "Ended"}
                    </Badge>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Trial ends</span>
                    <span>{formatDate(trialEnd)}</span>
                  </div>
                  {isActiveTrial && daysRemaining != null ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Days remaining
                      </span>
                      <span>{formatDaysRemaining(daysRemaining)}</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {!isInternalBilling && !isManualBilling ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Billing source
                      </span>
                      <span>{formatBillingSource(sub?.billingSource)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      Subscription status
                    </span>
                    <Badge variant="secondary">{formatLabel(sub?.status)}</Badge>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Access status</span>
                    <span>{access?.reasonLabel ?? "—"}</span>
                  </div>
                </>
              )}
            </div>

            {!isInternalBilling && !isManualBilling ? (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {showTrialLayout ? (
                  <ActionButton
                    size="sm"
                    onClick={handleTrialUpgrade}
                    disabled={isRedirecting}
                  >
                    <ArrowUp className="mr-2 size-4" />
                    Upgrade to paid plan
                  </ActionButton>
                ) : isStripeCanceledOrExpired ? (
                  <>
                    <ActionButton
                      size="sm"
                      onClick={openPlanSelection}
                      disabled={isRedirecting || !hasPlanGroup}
                    >
                      <CreditCard className="mr-2 size-4" />
                      Choose a paid plan
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="outline"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Manage billing
                    </ActionButton>
                  </>
                ) : (
                  <>
                    {cancellationScheduled ? (
                      <ActionButton
                        size="sm"
                        onClick={() => resumeMutation.mutate()}
                        disabled={resumeMutation.isPending}
                      >
                        Keep subscription
                      </ActionButton>
                    ) : null}
                    {isStripeBilling ? (
                      <ActionButton
                        size="sm"
                        variant="outline"
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                      >
                        <ExternalLink className="mr-2 size-4" />
                        Manage billing
                      </ActionButton>
                    ) : hasPlanGroup ? (
                      <ActionButton
                        size="sm"
                        onClick={startCheckout}
                        disabled={isRedirecting}
                      >
                        <CreditCard className="mr-2 size-4" />
                        Subscribe with Stripe
                      </ActionButton>
                    ) : null}
                    {showChangePlanAction && cancellationScheduled ? (
                      <ActionButton
                        size="sm"
                        onClick={() => openPlanChange("both")}
                      >
                        <ArrowUpDown className="mr-2 size-4" />
                        {planChangeLabel}
                      </ActionButton>
                    ) : null}
                    {showBothWays && !cancellationScheduled ? (
                      <ActionButton
                        size="sm"
                        onClick={() => openPlanChange("both")}
                      >
                        <ArrowUpDown className="mr-2 size-4" />
                        {planChangeLabel}
                      </ActionButton>
                    ) : null}
                    {showUpgradeOnly && !cancellationScheduled ? (
                      <ActionButton
                        size="sm"
                        onClick={() => openPlanChange("upgrade")}
                      >
                        <ArrowUp className="mr-2 size-4" />
                        {planChangeLabel}
                      </ActionButton>
                    ) : null}
                    {showDowngradeOnly ? (
                      <ActionButton
                        size="sm"
                        variant="outline"
                        onClick={() => openPlanChange("downgrade")}
                      >
                        <ArrowDown className="mr-2 size-4" />
                        {planChangeLabel}
                      </ActionButton>
                    ) : null}
                    {showCancelSubscription ? (
                      <ActionButton
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCancelOpen(true)}
                      >
                        Cancel subscription
                      </ActionButton>
                    ) : null}
                    {cancellationScheduled ? (
                      <Badge variant="secondary">Cancellation scheduled</Badge>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {showBillingPeriodSection ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {showTrialLayout ? "Trial details" : "Billing period"}
              </CardTitle>
              <CardDescription>
                {showTrialLayout
                  ? "Billing has not started yet."
                  : cancellationScheduled
                    ? "Access and cancellation details."
                    : "Payment method and renewal dates."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {showTrialLayout ? (
                <>
                  {sub?.currentPeriodStart ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Trial started</span>
                      <span>{formatDate(sub.currentPeriodStart)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Trial ends</span>
                    <span>{formatDate(trialEnd)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Billing</span>
                    <span>Not started yet</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Payment method</span>
                    <span>No payment method on file</span>
                  </div>
                  <p className="pt-2 text-muted-foreground">
                    No payment method is required during the trial. Billing starts
                    only after you choose a paid plan.
                  </p>
                </>
              ) : isInternalBilling || isManualBilling ? (
                <p className="text-muted-foreground">
                  {isInternalBilling
                    ? "This workspace does not require customer billing."
                    : "Payment details are managed by support for this workspace."}
                </p>
              ) : (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Payment method</span>
                    <span>
                      {formatPaymentMethodCustomer(sub?.paymentMethod)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Payment status</span>
                    <span>
                      {formatPaymentStatusCustomer(sub?.paymentStatus)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      {billingPeriodEndField.label}
                    </span>
                    <span>{formatDate(billingPeriodEndField.date)}</span>
                  </div>
                  {sub?.amount && sub.currency ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Amount</span>
                      <span>
                        {sub.currency} {sub.amount}
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {access?.warnings.length && !showTrialLayout ? (
        <Card>
          <CardHeader>
            <CardTitle>Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {access.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {cancellationScheduled && isStripeBilling ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-base">Cancellation scheduled</CardTitle>
            <CardDescription>
              Your subscription is scheduled to cancel on{" "}
              {formatDate(scheduledCancelDate)}. You will keep access until
              then.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionButton
              size="sm"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
            >
              Keep subscription
            </ActionButton>
          </CardContent>
        </Card>
      ) : null}
    </>
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader
        description={
          isBillingRecovery
            ? "Restore your subscription to regain full workspace access."
            : "Your subscription and plan details."
        }
      />

      <BusinessBillingTabs value={billingTab} onValueChange={setBillingTab} />

      {billingTab === "overview" ? (
        overviewContent
      ) : (
        <BusinessBillingInvoicesTab />
      )}

      <PlanChangeDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        mode={planChangeDirection}
        planSelectionMode={planSelectionMode}
        subscriptionStatus={subscriptionStatus}
        billingSource={billingSource}
        isBillingRecovery={isBillingRecovery || isCanceledOrExpired}
        showTrialLayout={showTrialLayout}
        cancellationScheduled={cancellationScheduled && isStripeBilling}
      />

      <ConfirmDeleteDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={
          isStripeBilling
            ? "Cancel subscription at period end?"
            : "Cancel subscription?"
        }
        description={
          isStripeBilling
            ? "You will keep access until the end of your current billing period. Stripe will stop renewing this subscription."
            : isManualBilling
              ? "Your subscription will end immediately, your workspace access will be removed, and you will be signed out."
              : "Your subscription will end immediately, your workspace access will be removed, and you will be signed out."
        }
        confirmLabel={isStripeBilling ? "Cancel at period end" : "Cancel subscription"}
        pendingLabel="Canceling…"
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />

      <BillingOwnerRequiredDialog
        open={ownerRequiredOpen}
        onOpenChange={setOwnerRequiredOpen}
        canManageTeam={canManageTeam}
      />
    </div>
  );
}
