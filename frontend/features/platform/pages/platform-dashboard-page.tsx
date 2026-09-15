"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import { DashboardOverviewHero } from "@/components/dashboard/dashboard-overview-hero";
import { HeroMetricCard } from "@/components/dashboard/hero-metric-card";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlatformDashboardStats } from "@/features/platform/api/platform.api";
import { getUserDisplayName } from "@/lib/auth";
import { useAuth } from "@/lib/auth/provider";
import { WORKSPACE_CSS_VARS } from "@/lib/design/workspace-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

function buildInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const QUICK_LINKS = [
  { href: "/platform/businesses", label: "Businesses" },
  { href: "/platform/tiers", label: "Tiers" },
  { href: "/platform/addons", label: "Add-ons" },
  { href: "/platform/audit-logs", label: "Audit logs" },
] as const;

export function PlatformDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.platform.dashboard.stats(),
    queryFn: () => getPlatformDashboardStats(),
  });

  const greetingName = user ? getUserDisplayName(user).split(" ")[0] : "there";
  const greetingInitials = buildInitials(greetingName);

  if (isError) {
    return (
      <ApiErrorState
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid w-full gap-4" style={WORKSPACE_CSS_VARS}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_210px_210px]">
          <Skeleton className="h-[126px] rounded-[var(--radius-2xl)] sm:col-span-2 xl:col-span-1" />
          <Skeleton className="h-[126px] rounded-[var(--radius-2xl)]" />
          <Skeleton className="h-[126px] rounded-[var(--radius-2xl)]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-[126px] rounded-[var(--radius-2xl)]" />
          <Skeleton className="h-[126px] rounded-[var(--radius-2xl)]" />
        </div>
        <Skeleton className="h-[170px] rounded-[var(--radius-2xl)]" />
      </div>
    );
  }

  return (
    <div className="grid w-full gap-4" style={WORKSPACE_CSS_VARS}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_210px_210px]">
        <DashboardOverviewHero
          className="sm:col-span-2 xl:col-span-1"
          avatarLabel={greetingInitials}
          title={`Hello ${greetingName}`}
          description={`${data.businesses.active} active businesses · ${data.businesses.suspended} suspended`}
        />
        <HeroMetricCard
          className="min-h-[126px]"
          label="Businesses"
          value={data.businesses.total}
        />
        <HeroMetricCard
          className="min-h-[126px]"
          label="Platform users"
          value={data.platformUsers}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <HeroMetricCard
          className="min-h-[126px]"
          label="MRR"
          value={`$${data.mrr}`}
        />
        <HeroMetricCard
          className="min-h-[126px]"
          label="CRM activity"
          value={data.leads}
        />
      </div>

      <DashboardCardShell title="Quick links" contentClassName="px-4 pb-4 pt-3">
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </DashboardCardShell>
    </div>
  );
}
