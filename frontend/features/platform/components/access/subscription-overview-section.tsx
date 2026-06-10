"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePackageDialog } from "@/features/platform/components/access/change-package-dialog";
import { SubscriptionActionBar } from "@/features/platform/components/access/subscription-action-bar";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import type { SubscriptionActionDefinition } from "@/features/platform/types/business-subscription";
import { formatPaymentMethod } from "@/features/platform/utils/access-labels";
import { deriveSubscriptionTabActionLayout } from "@/features/platform/utils/business-subscription-actions";
import { formatBillingCycleLabel } from "@/features/platform/utils/tier-price.util";
import {
  formatBillingPeriod,
  resolveNextBillingLabel,
  resolveSubscriptionTotal,
} from "@/features/platform/utils/subscription-overview.util";

type CapabilityRow = BusinessAccess["capabilities"][number];

function groupCapabilities(capabilities: CapabilityRow[]) {
  const active = capabilities.filter((c) => c.status === "ACTIVE");
  return {
    planTier: active.filter((c) => c.source === "PLAN_TIER"),
    customManual: active.filter(
      (c) => c.source === "CUSTOM" || c.source === "MANUAL",
    ),
  };
}

function CapabilityList({
  items,
  emptyLabel,
}: {
  items: CapabilityRow[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((cap) => (
        <li key={cap.id}>
          <Badge variant="secondary" className="font-normal">
            {cap.name}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function SubscriptionOverviewSection({
  access,
  canUpdate,
  isLoading,
  onManageAccess,
  onPackageChanged,
  onAction,
  actionBarLoading,
}: {
  access?: BusinessAccess | null;
  canUpdate: boolean;
  isLoading?: boolean;
  onManageAccess: () => void;
  onPackageChanged?: () => void;
  onAction?: (action: SubscriptionActionDefinition) => void;
  actionBarLoading?: boolean;
}) {
  const [changePackageOpen, setChangePackageOpen] = useState(false);

  const resolution = access?.resolution;
  const { planTier, customManual } = useMemo(
    () => groupCapabilities(access?.capabilities ?? []),
    [access?.capabilities],
  );

  const actionLayout = useMemo(
    () => (access ? deriveSubscriptionTabActionLayout(access) : null),
    [access],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 lg:col-span-2" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (!access?.subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No subscription configured yet.
          </p>
          {canUpdate ? (
            <Button type="button" size="sm" onClick={onManageAccess}>
              Manage Access
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const subscription = access.subscription;
  const total = resolveSubscriptionTotal(subscription);
  const nextBilling = resolveNextBillingLabel(subscription);
  const billingPeriod = formatBillingPeriod(
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
  );

  const handleAction = (action: SubscriptionActionDefinition) => {
    if (action.key === "CHANGE_PACKAGE") {
      setChangePackageOpen(true);
      return;
    }
    onAction?.(action);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Current Subscription
          </h2>
          <p className="text-sm text-muted-foreground">
            Plan, billing, and access for this workspace.
          </p>
        </div>
        {actionLayout && onAction ? (
          <SubscriptionActionBar
            layout={actionLayout}
            canUpdate={canUpdate}
            isLoading={actionBarLoading}
            onAction={handleAction}
            onManageAccess={onManageAccess}
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CardTitle className="text-base">Current Plan</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {subscription.status ? (
                  <StatusBadge status={subscription.status} domain="subscription" />
                ) : null}
                {subscription.paymentStatus ? (
                  <StatusBadge
                    status={subscription.paymentStatus}
                    domain="subscriptionPayment"
                  />
                ) : null}
                {resolution ? (
                  <Badge
                    variant={
                      resolution.canAccessWorkspace ? "default" : "destructive"
                    }
                  >
                    {resolution.canAccessWorkspace
                      ? "Can access"
                      : "Cannot access"}
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!subscription.planTierId ? (
              <div className="rounded-md border border-dashed p-3 text-sm">
                <p className="text-muted-foreground">No plan tier assigned.</p>
                {canUpdate ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => setChangePackageOpen(true)}
                  >
                    Assign Plan
                  </Button>
                ) : null}
              </div>
            ) : null}

            <dl className="grid gap-3 sm:grid-cols-2">
              <OverviewField
                label="Plan group"
                value={subscription.planGroupName ?? "—"}
              />
              <OverviewField
                label="Plan tier"
                value={subscription.planTierName ?? "—"}
              />
              <OverviewField
                label="Billing cycle"
                value={formatBillingCycleLabel(subscription.billingCycle)}
              />
              <OverviewField
                label="Total subscription price"
                value={total.display}
              />
              <OverviewField
                label="Current period"
                value={billingPeriod}
              />
              <OverviewField
                label={nextBilling.label}
                value={nextBilling.value}
              />
              <OverviewField
                label="Payment method"
                value={
                  subscription.paymentMethod
                    ? formatPaymentMethod(subscription.paymentMethod)
                    : "Not set"
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add-ons &amp; Custom Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Included in plan
              </p>
              <CapabilityList
                items={planTier}
                emptyLabel="No plan capabilities synced yet."
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Custom / Manual access
              </p>
              <CapabilityList
                items={customManual}
                emptyLabel="No custom add-ons yet."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Add-ons will be managed as subscription items in a later phase. For
              now, extra access is tracked as custom/manual capabilities.
            </p>
          </CardContent>
        </Card>
      </div>

      {canUpdate ? (
        <ChangePackageDialog
          businessId={access.businessId}
          access={access}
          open={changePackageOpen}
          onOpenChange={setChangePackageOpen}
          onSuccess={() => {
            setChangePackageOpen(false);
            onPackageChanged?.();
          }}
        />
      ) : null}
    </div>
  );
}

function OverviewField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
