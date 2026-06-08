"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/layout/stats-card";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { SnapshotDashboardConfig } from "@/features/platform/types/snapshot";
import { resolveDashboardWidgets } from "@/lib/config/snapshot/resolve-dashboard-widgets";
import { createTerminologyResolver } from "@/lib/snapshot/resolve-terminology";
import { queryKeys } from "@/lib/query/keys";
import type { BusinessDashboardStats } from "@/lib/types/shared";
import { getBusinessDashboardStats } from "@/features/settings/api/business.api";

interface BusinessDashboardStatsProps {
  dashboardConfig?: SnapshotDashboardConfig;
  terminology?: Record<string, string>;
  contextLoading?: boolean;
}

function widgetValue(
  key: string,
  data: BusinessDashboardStats,
): { value: number | string; description?: string } {
  switch (key) {
    case "leads": {
      const leadDescription = [
        data.leads.total !== data.leads.active
          ? `${data.leads.total} total`
          : null,
        data.leads.won > 0 ? `${data.leads.won} won` : null,
        data.leads.lost > 0 ? `${data.leads.lost} lost` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        value: data.leads.active,
        description: leadDescription || `${data.leads.total} in pipeline`,
      };
    }
    case "contacts":
      return { value: data.contacts };
    case "appointments":
      return {
        value: data.appointmentStats.today,
        description: `${data.appointmentStats.upcoming} upcoming · ${data.appointmentStats.cancelledOrNoShow} cancelled/no-show`,
      };
    case "conversations":
      return { value: data.conversations };
    case "workItems":
      return {
        value: data.workItems.total,
        description: `${data.workItems.scheduled} scheduled · ${data.workItems.pending} in progress`,
      };
    case "workItemsCompleted":
      return { value: data.workItems.completed };
    case "pipelines":
      return { value: data.pipelines };
    case "wonDeals":
      return {
        value: data.leads.won,
        description:
          data.leads.lost > 0 ? `${data.leads.lost} lost` : undefined,
      };
    case "teamMembers":
      return { value: data.members };
    default:
      return { value: 0 };
  }
}

export function BusinessDashboardStatsGrid({
  dashboardConfig,
  terminology,
  contextLoading = false,
}: BusinessDashboardStatsProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.business.dashboardStats(),
    queryFn: () => getBusinessDashboardStats(),
  });

  const resolveLabel = useMemo(
    () => createTerminologyResolver(terminology),
    [terminology],
  );

  const widgets = useMemo(
    () => resolveDashboardWidgets(dashboardConfig?.widgets, resolveLabel),
    [dashboardConfig?.widgets, resolveLabel],
  );

  if (isLoading || contextLoading) {
    return (
      <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="min-h-[7.25rem] rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ApiErrorState
        error={error}
        compact
        onRetry={() => void refetch()}
      />
    );
  }

  if (!data) {
    return null;
  }

  if (widgets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No dashboard widgets configured for this business.
      </p>
    );
  }

  return (
    <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {widgets.map((widget) => {
        const { value, description } = widgetValue(widget.key, data);
        return (
          <StatsCard
            key={widget.key}
            label={widget.label}
            value={value}
            description={description}
            href={widget.href}
            icon={widget.icon}
            comingSoon={widget.comingSoon}
          />
        );
      })}
    </div>
  );
}
