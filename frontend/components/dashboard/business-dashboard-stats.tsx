"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ClipboardList,
  Contact,
  GitBranch,
  MessageSquare,
  Users,
  Workflow,
} from "lucide-react";
import { StatsCard } from "@/components/layout/stats-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { IndustryLabels } from "@/types/api";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { BusinessDashboardStats } from "@/types/api";

interface BusinessDashboardStatsProps {
  labels: IndustryLabels;
}

export function BusinessDashboardStatsGrid({
  labels,
}: BusinessDashboardStatsProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.business.dashboardStats(),
    queryFn: () =>
      apiClient<BusinessDashboardStats>("businesses/current/dashboard-stats"),
  });

  if (isLoading) {
    return (
      <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="min-h-[7.25rem] rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        Could not load dashboard stats. Refresh the page to try again.
      </p>
    );
  }

  const leadDescription = [
    data.leads.total !== data.leads.active
      ? `${data.leads.total} total`
      : null,
    data.leads.won > 0 ? `${data.leads.won} won` : null,
    data.leads.lost > 0 ? `${data.leads.lost} lost` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={labels.leads}
          value={data.leads.active}
          description={
            leadDescription || `${data.leads.total} in pipeline`
          }
          href="/business/pipelines"
          icon={Workflow}
        />
        <StatsCard
          label={labels.contacts}
          value={data.contacts}
          href="/business/contacts"
          icon={Contact}
        />
        <StatsCard
          label={labels.appointments}
          value={data.appointmentStats.today}
          description={`${data.appointmentStats.upcoming} upcoming · ${data.appointmentStats.cancelledOrNoShow} cancelled/no-show`}
          href="/business/appointments"
          icon={Calendar}
        />
        <StatsCard
          label={labels.conversations}
          value={data.conversations}
          href="/business/conversations"
          icon={MessageSquare}
          comingSoon
        />
      </div>
      <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={labels.workItems}
          value={data.workItems.total}
          description={`${data.workItems.scheduled} scheduled · ${data.workItems.pending} in progress`}
          href="/business/work-items"
          icon={ClipboardList}
        />
        <StatsCard
          label={`Completed ${labels.workItems.toLowerCase()}`}
          value={data.workItems.completed}
          href="/business/work-items"
          icon={ClipboardList}
        />
        <StatsCard
          label={labels.pipelines}
          value={data.pipelines}
          href="/business/pipelines"
          icon={GitBranch}
        />
        <StatsCard
          label="Won deals"
          value={data.leads.won}
          description={
            data.leads.lost > 0 ? `${data.leads.lost} lost` : undefined
          }
          href="/business/pipelines"
          icon={Workflow}
        />
        <StatsCard
          label="Team members"
          value={data.members}
          href="/business/settings/team"
          icon={Users}
        />
      </div>
    </div>
  );
}
