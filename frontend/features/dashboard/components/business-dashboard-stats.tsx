"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  DASHBOARD_WIDGET_REGISTRY,
  type DashboardWidgetKey,
} from "@/lib/config/snapshot/widget-registry";
import type { BusinessDashboardStats } from "@/lib/types/shared";
import { DASHBOARD_DRAFT_WIDGET_KEYS } from "@/lib/config/snapshot/dashboard-draft-layout";

const DEFAULT_WIDGET_LABELS: Partial<Record<DashboardWidgetKey, string>> = {
  appointments: "Appointments",
  contacts: "Contacts",
  conversations: "Conversations",
  leads: "Active leads",
  pipelines: "Pipelines",
  teamMembers: "Team members",
  workItems: "In progress",
  workItemsCompleted: "Completed work",
  wonDeals: "Won deals",
};

interface BusinessDashboardStatsProps {
  stats?: BusinessDashboardStats;
  isLoading?: boolean;
  contextLoading?: boolean;
  widgetKeys?: DashboardWidgetKey[];
  labels?: Partial<Record<DashboardWidgetKey, string>>;
}

function widgetValue(
  key: DashboardWidgetKey,
  data: BusinessDashboardStats,
): number | string {
  switch (key) {
    case "appointments":
      return data.appointmentStats.today;
    case "contacts":
      return data.contacts;
    case "conversations":
      return data.conversations;
    case "wonDeals":
      return data.leads.won;
    case "leads":
      return data.leads.active;
    case "teamMembers":
      return data.members;
    case "workItems":
      return data.workItems.pending;
    case "workItemsCompleted":
      return data.workItems.completed;
    case "pipelines":
      return data.pipelines;
    default:
      return 0;
  }
}

export function BusinessDashboardStatsGrid({
  stats,
  isLoading = false,
  contextLoading = false,
  widgetKeys = DASHBOARD_DRAFT_WIDGET_KEYS,
  labels,
}: BusinessDashboardStatsProps) {
  const widgets = useMemo(
    () =>
      widgetKeys.map((key, order) => ({
        ...DASHBOARD_WIDGET_REGISTRY[key],
        order,
        label:
          labels?.[key] ??
          DEFAULT_WIDGET_LABELS[key] ??
          DASHBOARD_WIDGET_REGISTRY[key].labelKey,
      })),
    [labels, widgetKeys],
  );

  if (isLoading || contextLoading) {
    return (
      <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="min-h-[5.5rem] rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {widgets.map((widget) => (
        <KpiCard
          key={widget.key}
          label={widget.label}
          value={widgetValue(widget.key, stats)}
          href={widget.href}
          icon={widget.icon}
        />
      ))}
    </div>
  );
}
