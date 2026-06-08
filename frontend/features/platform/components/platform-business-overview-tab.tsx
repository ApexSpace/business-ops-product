"use client";

import Link from "next/link";
import type React from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformBusinessUtilizationSection } from "@/features/platform/components/platform-business-utilization-cards";
import type {
  AuditLog,
  BillingSubscription,
  Business,
  PlatformBusinessUtilization,
} from "@/features/platform/types";
import type { PlatformBusinessDetailTab } from "@/features/platform/components/platform-business-detail-tabs";

function HealthMetric({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 truncate text-base font-semibold tracking-tight">
        {primary}
      </div>
      {secondary ? (
        <div className="mt-0.5 text-xs text-muted-foreground">{secondary}</div>
      ) : null}
    </div>
  );
}

function formatRelativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PlatformBusinessOverviewTab({
  business,
  utilization,
  utilizationLoading,
  subscription,
  recentAuditLogs,
  onNavigateTab,
}: {
  business: Business;
  utilization?: PlatformBusinessUtilization;
  utilizationLoading: boolean;
  subscription?: BillingSubscription | null;
  recentAuditLogs?: AuditLog[];
  onNavigateTab: (tab: PlatformBusinessDetailTab) => void;
}) {
  if (utilizationLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    );
  }

  const teamActive = utilization?.team.activeMembers ?? 0;
  const teamInvited = utilization?.team.invitedMembers ?? 0;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg ring-1 ring-border/70">
        <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <HealthMetric
            label="Plan"
            primary={subscription?.planName ?? "No plan"}
            secondary={
              subscription ? (
                <StatusBadge
                  status={subscription.status}
                  domain="subscription"
                />
              ) : (
                "Not assigned"
              )
            }
          />
          <HealthMetric
            label="Team"
            primary={`${teamActive} active`}
            secondary={
              teamInvited > 0
                ? `${teamInvited} invited`
                : "All members active"
            }
          />
          <HealthMetric
            label="Blueprint"
            primary={
              business.snapshotName ??
              utilization?.blueprint.snapshotName ??
              "Default"
            }
            secondary={
              business.snapshotAppliedAt
                ? `Applied ${new Date(business.snapshotAppliedAt).toLocaleDateString()}`
                : "Not applied"
            }
          />
        </div>

        {utilization ? (
          <PlatformBusinessUtilizationSection utilization={utilization} />
        ) : null}
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Recent activity</h3>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => onNavigateTab("activity")}
          >
            View all
          </button>
        </div>
        {recentAuditLogs?.length ? (
          <ul className="divide-y divide-border/60">
            {recentAuditLogs.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span className="font-mono text-xs">{log.action}</span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {formatRelativeTime(log.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            No recent activity
          </p>
        )}
      </section>

      <div className="text-sm text-muted-foreground">
        <span>Business ID: </span>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          {business.id}
        </code>
        {business.snapshotId ? (
          <>
            {" · "}
            <Link
              href={`/platform/snapshots/${business.snapshotId}`}
              className="text-primary hover:underline"
            >
              View snapshot
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
