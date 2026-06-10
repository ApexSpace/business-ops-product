"use client";

import { AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import {
  formatNeedsAttentionFlag,
  formatPaymentMethod,
} from "@/features/platform/utils/access-labels";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function BusinessAccessSummaryCard({
  access,
  compact = false,
}: {
  access: Pick<
    BusinessAccess,
    | "businessStatus"
    | "snapshotId"
    | "snapshotName"
    | "snapshotAppliedAt"
    | "subscription"
    | "capabilities"
    | "resolution"
  >;
  compact?: boolean;
}) {
  const resolution = access.resolution;
  if (!resolution) return null;

  const sub = access.subscription;
  const activeCapabilities =
    resolution.effectiveCapabilities.length ||
    access.capabilities.filter((c) => c.status === "ACTIVE").length;

  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-base">Current Subscription</CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Access Result</p>
            <Badge
              variant={resolution.canAccessWorkspace ? "default" : "destructive"}
              className="mt-1"
            >
              {resolution.canAccessWorkspace ? "Can access" : "Cannot access"}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{resolution.reasonLabel}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryItem label="Workspace">
            <StatusBadge status={access.businessStatus} domain="business" />
          </SummaryItem>
          <SummaryItem label="Subscription">
            {sub?.status ? (
              <StatusBadge status={sub.status} domain="subscription" />
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </SummaryItem>
          <SummaryItem label="Payment status">
            {sub?.paymentStatus ? (
              <StatusBadge status={sub.paymentStatus} domain="subscriptionPayment" />
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </SummaryItem>
          <SummaryItem label="Plan group">
            <span className="text-sm">{sub?.planGroupName ?? "—"}</span>
          </SummaryItem>
          <SummaryItem label="Plan tier">
            <span className="text-sm">{sub?.planTierName ?? "—"}</span>
          </SummaryItem>
          <SummaryItem label="Billing cycle">
            <span className="text-sm">{sub?.billingCycle ?? "—"}</span>
          </SummaryItem>
          <SummaryItem label="Amount">
            <span className="text-sm">
              {sub?.amount ? `${sub.amount} ${sub.currency ?? ""}`.trim() : "—"}
            </span>
          </SummaryItem>
          <SummaryItem label="Payment method">
            <span className="text-sm">
              {sub?.paymentMethod
                ? formatPaymentMethod(sub.paymentMethod)
                : "—"}
            </span>
          </SummaryItem>
          <SummaryItem label={sub?.nextBillingLabel ?? "Next billing"}>
            <span className="text-sm">
              {formatDate(sub?.nextBillingDate ?? sub?.currentPeriodEnd)}
            </span>
          </SummaryItem>
          <SummaryItem label="Current period">
            <span className="text-sm">
              {formatDate(sub?.currentPeriodStart)} → {formatDate(sub?.currentPeriodEnd)}
            </span>
          </SummaryItem>
          <SummaryItem label="Snapshot">
            <span className="text-sm">{access.snapshotName ?? "—"}</span>
          </SummaryItem>
          <SummaryItem label="Snapshot applied">
            <span className="text-sm">{formatDate(access.snapshotAppliedAt)}</span>
          </SummaryItem>
          <SummaryItem label="Capabilities">
            <span className="text-sm">{activeCapabilities}</span>
          </SummaryItem>
        </div>

        {resolution.needsAttention.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Needs Attention
            </p>
            <div className="flex flex-wrap gap-2">
              {resolution.needsAttention.map((flag) => (
                <TooltipProvider key={flag}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="gap-1">
                        <AlertTriangle className="size-3" />
                        {formatNeedsAttentionFlag(flag)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{formatNeedsAttentionFlag(flag)}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}

        {resolution.warnings.length > 0 && (
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
            {resolution.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function CurrentPaymentSummaryCard({
  access,
}: {
  access: Pick<BusinessAccess, "subscription">;
}) {
  const sub = access.subscription;
  if (!sub) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Current Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label="Payment status">
            {sub.paymentStatus ? (
              <StatusBadge status={sub.paymentStatus} domain="subscriptionPayment" />
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </SummaryItem>
          <SummaryItem label="Payment method">
            <span className="text-sm">
              {sub.paymentMethod
                ? formatPaymentMethod(sub.paymentMethod)
                : "—"}
            </span>
          </SummaryItem>
          <SummaryItem label="Amount">
            <span className="text-sm">
              {sub.amount ? `${sub.amount} ${sub.currency ?? ""}`.trim() : "—"}
            </span>
          </SummaryItem>
          <SummaryItem label="Billing cycle">
            <span className="text-sm">{sub.billingCycle ?? "—"}</span>
          </SummaryItem>
        </div>
      </CardContent>
    </Card>
  );
}
