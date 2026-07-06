"use client";

import { useQuery } from "@tanstack/react-query";
import { AppointmentConfirmationsCard } from "@/components/dashboard/appointment-confirmations-card";
import { DashboardBreakdownCard } from "@/components/dashboard/dashboard-breakdown-card";
import { DashboardOverviewHero } from "@/components/dashboard/dashboard-overview-hero";
import { HeroMetricCard } from "@/components/dashboard/hero-metric-card";
import { RecentConversationsCard } from "@/components/dashboard/recent-conversations-card";
import { ScheduleRailCard } from "@/components/dashboard/schedule-rail-card";
import { TaskQueueCard } from "@/components/dashboard/task-queue-card";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getBusinessDashboardFeed } from "@/features/dashboard/api/dashboard.api";
import { getUserDisplayName } from "@/lib/auth";
import { useAuth } from "@/lib/auth/provider";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { formatMoney } from "@/features/payments/utils/currencies";
import { resolveBusinessNicheProfile } from "@/lib/config/niche";
import { queryKeys } from "@/lib/query/keys";
import { useSnapshotContext } from "@/lib/snapshot/use-snapshot-context";

function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTrend(deltaPercent: number): string {
  const absolute = Math.abs(deltaPercent).toFixed(1);
  if (deltaPercent >= 0) {
    return `vs last week +${absolute}%`;
  }
  return `vs last week -${absolute}%`;
}

export function BusinessDashboardPage() {
  const { context, isLoading: contextLoading } = useSnapshotContext();
  const { data: business } = useCurrentBusiness();
  const { user } = useAuth();

  const feedQuery = useQuery({
    queryKey: queryKeys.business.dashboardFeed(),
    queryFn: () => getBusinessDashboardFeed(),
  });

  const stats = feedQuery.data?.stats;
  const currencyCode = business?.taxesAndCurrency?.currencyCode ?? "USD";
  const nicheProfile = resolveBusinessNicheProfile({
    business,
    snapshotContext: context,
  });
  const greetingName = user ? getUserDisplayName(user).split(" ")[0] : "there";
  const greetingInitials = buildInitials(greetingName);

  const revenueByCategory = feedQuery.data?.revenueByCategory ?? [];
  const bookingsBySource = feedQuery.data?.bookingsBySource ?? [];

  const revenueBreakdownItems = revenueByCategory.map((item, index) => ({
    id: item.id,
    label: item.label,
    value: formatMoney(parseAmount(item.amount), currencyCode),
    progress: item.sharePercent,
    accentClassName:
      index === 0
        ? "bg-[#4c7cf0]"
        : index === 1
          ? "bg-[#dc3545]"
          : index === 2
            ? "bg-[#c88a12]"
            : "bg-[#1f9d63]",
  }));

  const leadingBookingSourceCount = bookingsBySource[0]?.count ?? 0;
  const bookingsBySourceItems = bookingsBySource.map((item, index) => ({
    id: item.source,
    label: item.label,
    value: String(item.count),
    meta: `${item.deltaPercent >= 0 ? "↑" : "↓"}${Math.abs(item.deltaPercent).toFixed(1)}%`,
    progress:
      leadingBookingSourceCount > 0
        ? (item.count / leadingBookingSourceCount) * 100
        : 0,
    accentClassName:
      index === 0
        ? "bg-[#4c7cf0]"
        : index === 1
          ? "bg-[#1f9d63]"
          : index === 2
            ? "bg-[#dc3545]"
            : "bg-[#c88a12]",
  }));

  if (feedQuery.isError) {
    return (
      <ApiErrorState
        error={feedQuery.error}
        onRetry={() => void feedQuery.refetch()}
      />
    );
  }

  if (feedQuery.isLoading || contextLoading) {
    return (
      <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_210px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_210px_210px]">
            <Skeleton className="h-[126px] rounded-[14px] sm:col-span-2 xl:col-span-1" />
            <Skeleton className="h-[126px] rounded-[14px]" />
            <Skeleton className="h-[126px] rounded-[14px]" />
          </div>
          <Skeleton className="h-[198px] rounded-[14px]" />
          <Skeleton className="h-[146px] rounded-[14px]" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Skeleton className="h-[170px] rounded-[14px]" />
            <Skeleton className="h-[170px] rounded-[14px]" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[198px] rounded-[14px]" />
          <Skeleton className="h-[126px] rounded-[14px]" />
          <Skeleton className="h-[126px] rounded-[14px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_210px]">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_210px_210px]">
          <DashboardOverviewHero
            className="sm:col-span-2 xl:col-span-1"
            avatarLabel={greetingInitials}
            title={`Hello ${greetingName}`}
            description={`${feedQuery.data?.overview.waitingClientsToday ?? 0} clients waiting today`}
          />
          <HeroMetricCard
            className="min-h-[126px]"
            label="Today's appointments"
            value={feedQuery.data?.todayAppointmentsMetric.value ?? stats?.appointmentStats.today ?? 0}
            trendLabel={formatTrend(feedQuery.data?.todayAppointmentsMetric.deltaPercent ?? 0)}
            trendDirection={
              (feedQuery.data?.todayAppointmentsMetric.deltaPercent ?? 0) < 0 ? "down" : "up"
            }
            sparklinePoints={feedQuery.data?.todayAppointmentsMetric.points}
          />
          <HeroMetricCard
            className="min-h-[126px]"
            label="New leads"
            value={feedQuery.data?.newLeadsMetric.value ?? 0}
            trendLabel={formatTrend(feedQuery.data?.newLeadsMetric.deltaPercent ?? 0)}
            trendDirection={
              (feedQuery.data?.newLeadsMetric.deltaPercent ?? 0) < 0 ? "down" : "up"
            }
            sparklinePoints={feedQuery.data?.newLeadsMetric.points}
          />
        </div>

        <AppointmentConfirmationsCard
          title={nicheProfile.dashboard.appointmentsToConfirmTitle}
          appointments={feedQuery.data?.appointmentsToConfirm ?? []}
          timezone={business?.timezone ?? undefined}
        />

        <RecentConversationsCard
          title="Recent conversations (last 7 days)"
          conversations={feedQuery.data?.recentConversations ?? []}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <DashboardBreakdownCard
            title={nicheProfile.dashboard.revenueByCategoryTitle}
            items={revenueBreakdownItems}
            actionLabel="Full report"
            actionHref="/business/payments"
            variant="bars"
          />
          <DashboardBreakdownCard
            title="Bookings by channel"
            items={bookingsBySourceItems}
            actionLabel="See all"
            actionHref="/business/appointments"
            variant="list"
          />
        </div>
      </div>

      <div className="space-y-4">
        <ScheduleRailCard
          title="My schedule"
          appointments={feedQuery.data?.todayAppointments ?? []}
          timezone={business?.timezone ?? undefined}
        />
        <TaskQueueCard
          title={nicheProfile.dashboard.followUpsTitle}
          items={feedQuery.data?.followUpTasks ?? []}
          emptyMessage="No follow-ups are due right now."
          bulletClassName="bg-[#4c7cf0]"
        />
        <TaskQueueCard
          title={nicheProfile.dashboard.staffAssignmentsTitle}
          items={feedQuery.data?.staffAssignments ?? []}
          emptyMessage="No staff tasks need attention yet."
          bulletClassName="bg-[#c88a12]"
        />
      </div>
    </div>
  );
}
