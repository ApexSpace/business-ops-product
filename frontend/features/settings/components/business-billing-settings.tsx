"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { useAuth } from "@/lib/auth/provider";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { useBusinessAccess } from "@/lib/business-access/use-business-access";
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
  getBusinessPlanOptions,
} from "@/features/settings/api/business-billing.api";
import {
  PlanChangeDialog,
  type PlanChangeMode,
} from "@/features/settings/components/plan-change-dialog";
import {
  canChangePlanBothWays,
  canDowngrade,
  canUpgrade,
  getPlanChangeButtonLabel,
  getTierPosition,
} from "@/features/settings/utils/plan-tier-position.util";
import { queryKeys } from "@/lib/query/keys";

function formatLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function BusinessBillingSettings() {
  const router = useAppRouter();
  const { logout } = useAuth();
  const { access, isLoading } = useBusinessAccess();
  const [planDialogMode, setPlanDialogMode] = useState<PlanChangeMode | null>(
    null,
  );
  const [cancelOpen, setCancelOpen] = useState(false);

  const hasPlanGroup = Boolean(access?.subscription?.planGroupId);

  const { data: planOptions } = useQuery({
    queryKey: queryKeys.business.planOptions(),
    queryFn: getBusinessPlanOptions,
    enabled: hasPlanGroup,
  });

  const tierPosition = useMemo(
    () =>
      getTierPosition(
        planOptions?.currentPlanTierIndex ?? -1,
        planOptions?.tiers.length ?? 0,
      ),
    [planOptions?.currentPlanTierIndex, planOptions?.tiers.length],
  );

  const showBothWays = hasPlanGroup && canChangePlanBothWays(tierPosition);
  const showUpgradeOnly =
    hasPlanGroup && canUpgrade(tierPosition) && !showBothWays;
  const showDowngradeOnly =
    hasPlanGroup && canDowngrade(tierPosition) && !showBothWays;
  const planChangeLabel = getPlanChangeButtonLabel(tierPosition);
  const subscriptionStatus = access?.subscription?.status?.toUpperCase();
  const showCancelSubscription =
    Boolean(access?.subscription?.id) && subscriptionStatus !== "CANCELED";

  const cancelMutation = useMutation({
    mutationFn: () => cancelBusinessSubscription(),
    onSuccess: async () => {
      setCancelOpen(false);
      toast.info(
        "Your subscription has been canceled. Removing workspace access…",
      );
      await logout();
      router.push("/login?reason=subscription-canceled");
    },
    onError: (err: Error) => toast.error(err.message),
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

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader description="Your subscription and plan details." />

      {blockedCopy ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-base">{blockedCopy.title}</CardTitle>
            <CardDescription>{blockedCopy.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>Package assigned to this workspace.</CardDescription>
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
                <span className="text-muted-foreground">Subscription status</span>
                <Badge variant="secondary">{formatLabel(sub?.status)}</Badge>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Access status</span>
                <span>{access?.reasonLabel ?? "—"}</span>
              </div>
            </div>

            {showBothWays ||
            showUpgradeOnly ||
            showDowngradeOnly ||
            showCancelSubscription ? (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {showBothWays ? (
                  <ActionButton
                    size="sm"
                    onClick={() => setPlanDialogMode("both")}
                  >
                    <ArrowUpDown className="mr-2 size-4" />
                    {planChangeLabel}
                  </ActionButton>
                ) : null}
                {showUpgradeOnly ? (
                  <ActionButton
                    size="sm"
                    onClick={() => setPlanDialogMode("upgrade")}
                  >
                    <ArrowUp className="mr-2 size-4" />
                    {planChangeLabel}
                  </ActionButton>
                ) : null}
                {showDowngradeOnly ? (
                  <ActionButton
                    size="sm"
                    variant="outline"
                    onClick={() => setPlanDialogMode("downgrade")}
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
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing period</CardTitle>
            <CardDescription>Payment method and renewal dates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment method</span>
              <span>{formatLabel(sub?.paymentMethod)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment status</span>
              <span>{formatLabel(sub?.paymentStatus)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Current period ends</span>
              <span>{formatDate(sub?.currentPeriodEnd)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Amount</span>
              <span>
                {sub?.amount && sub.currency
                  ? `${sub.currency} ${sub.amount}`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {access?.warnings.length ? (
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

      <PlanChangeDialog
        open={planDialogMode !== null}
        onOpenChange={(open) => !open && setPlanDialogMode(null)}
        mode={planDialogMode ?? "both"}
      />

      <ConfirmDeleteDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel subscription?"
        description="Your subscription will end immediately, your workspace access will be removed, and you will be signed out."
        confirmLabel="Cancel subscription"
        pendingLabel="Canceling…"
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />
    </div>
  );
}
