"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessAccessSummaryCard } from "@/features/platform/components/access/business-access-summary-card";
import { PlatformBusinessUtilizationSection } from "@/features/platform/components/platform-business-utilization-cards";
import type {
  Business,
  PlatformBusinessUtilization,
} from "@/features/platform/types";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import { formatNeedsAttentionFlag } from "@/features/platform/utils/access-labels";

export function PlatformBusinessOverviewTab({
  business,
  access,
  utilization,
  utilizationLoading,
}: {
  business: Business;
  access?: BusinessAccess | null;
  utilization?: PlatformBusinessUtilization;
  utilizationLoading: boolean;
}) {
  if (utilizationLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {access ? (
        <BusinessAccessSummaryCard access={access} compact />
      ) : (
        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={business.canAccessWorkspace ? "default" : "destructive"}
            >
              {business.canAccessWorkspace ? "Can Access" : "Cannot Access"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {business.reasonLabel ?? "—"}
            </span>
          </div>
          {business.needsAttention?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {business.needsAttention.map((flag) => (
                <Badge key={flag} variant="outline">
                  {formatNeedsAttentionFlag(flag as never)}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {utilization ? (
        <div className="overflow-hidden rounded-lg ring-1 ring-border/70">
          <PlatformBusinessUtilizationSection utilization={utilization} />
        </div>
      ) : null}

      <div className="text-sm text-muted-foreground">
        <span>Business ID: </span>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          {business.id}
        </code>
      </div>
    </div>
  );
}
