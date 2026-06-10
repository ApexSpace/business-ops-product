"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePackageDialog } from "@/features/platform/components/access/change-package-dialog";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import type {
  BusinessSubscriptionEventListItem,
  SubscriptionActionDefinition,
} from "@/features/platform/types/business-subscription";
import { formatPaymentMethod } from "@/features/platform/utils/access-labels";
import { formatBillingCycleLabel } from "@/features/platform/utils/tier-price.util";
import {
  formatBillingPeriod,
  resolveNextBillingLabel,
  resolveSubscriptionTotal,
} from "@/features/platform/utils/subscription-overview.util";

const PRIMARY_ACTION_KEYS = new Set<SubscriptionActionDefinition["key"]>([
  "CHANGE_PACKAGE",
  "RECORD_PAYMENT",
]);

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
  lastEvent,
  onManageAccess,
  onRecordPayment,
  onPackageChanged,
  onAction,
}: {
  access?: BusinessAccess | null;
  canUpdate: boolean;
  isLoading?: boolean;
  lastEvent?: BusinessSubscriptionEventListItem | null;
  onManageAccess: () => void;
  onRecordPayment: () => void;
  onPackageChanged?: () => void;
  onAction?: (action: SubscriptionActionDefinition) => void;
}) {
  const [changePackageOpen, setChangePackageOpen] = useState(false);

  const resolution = access?.resolution;
  const { planTier, customManual } = useMemo(
    () => groupCapabilities(access?.capabilities ?? []),
    [access?.capabilities],
  );

  const moreActions = useMemo(() => {
    const actions = access?.availableActions ?? [];
    return actions.filter(
      (a) =>
        a.visible &&
        a.enabled &&
        !PRIMARY_ACTION_KEYS.has(a.key),
    );
  }, [access?.availableActions]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 lg:col-span-2" />
          <Skeleton className="h-56" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Current Subscription</h2>
        <p className="text-sm text-muted-foreground">
          Plan, billing, and access for this workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMiniCard
          label="Current Status"
          value={
            subscription.status ? (
              <StatusBadge status={subscription.status} domain="subscription" />
            ) : (
              "—"
            )
          }
        />
        <SummaryMiniCard label="Total" value={total.display} />
        <SummaryMiniCard label={nextBilling.label} value={nextBilling.value} />
        <SummaryMiniCard
          label="Last Change"
          value={lastEvent?.title ?? "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Current Plan</CardTitle>
                <p className="mt-1 text-lg font-semibold">
                  {subscription.planTierName ?? (
                    <span className="text-muted-foreground font-normal text-sm">
                      No plan tier assigned.
                    </span>
                  )}
                </p>
                {subscription.planGroupName ? (
                  <p className="text-sm text-muted-foreground">
                    {subscription.planGroupName}
                  </p>
                ) : null}
              </div>
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
                    Change Package
                  </Button>
                ) : null}
              </div>
            ) : null}

            <dl className="grid gap-3 sm:grid-cols-2">
              <OverviewField
                label="Billing cycle"
                value={formatBillingCycleLabel(subscription.billingCycle)}
              />
              <OverviewField
                label="Total subscription price"
                value={total.display}
              />
              <OverviewField
                label={nextBilling.label}
                value={nextBilling.value}
              />
              <OverviewField
                label="Current period"
                value={billingPeriod}
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

            {resolution?.reasonLabel ? (
              <p className="text-sm text-muted-foreground">
                Access result: {resolution.reasonLabel}
              </p>
            ) : null}

            {canUpdate ? (
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setChangePackageOpen(true)}
                >
                  Change Package
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={onRecordPayment}
                >
                  Record Payment
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onManageAccess}
                >
                  Manage Access
                </Button>
                {moreActions.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button type="button" size="sm" variant="outline">
                          More actions
                          <ChevronDown className="ml-1 size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="start">
                      {moreActions.map((action) => (
                        <DropdownMenuItem
                          key={action.key}
                          disabled={!action.enabled}
                          onClick={() => {
                            if (action.key === "RECORD_PAYMENT") {
                              onRecordPayment();
                              return;
                            }
                            if (onAction) {
                              onAction(action);
                              return;
                            }
                            onManageAccess();
                          }}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            ) : null}
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

function SummaryMiniCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 text-sm font-medium">{value}</div>
      </CardContent>
    </Card>
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
