"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FilterBar } from "@/components/layout/filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubscriptionEventDetailDrawer } from "@/features/platform/components/access/subscription-event-detail-drawer";
import { SubscriptionOverviewSection } from "@/features/platform/components/access/subscription-overview-section";
import { listPlatformBusinessSubscriptionEvents } from "@/features/platform/api/business-access.api";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import type { SubscriptionAccessStatus } from "@/features/platform/types/business-access";
import type {
  BusinessSubscriptionEventListItem,
  BusinessSubscriptionEventType,
  ListSubscriptionEventsQuery,
  SubscriptionActionDefinition,
} from "@/features/platform/types/business-subscription";
import { formatSubscriptionEventLabel } from "@/features/platform/utils/access-labels";
import {
  subscriptionEventTypeFilterOptions,
  subscriptionStatusFilterOptions,
} from "@/features/platform/utils/select-options";
import { queryKeys } from "@/lib/query/keys";

const PAGE_LIMIT = 25;

export function PlatformBusinessSubscriptionsTab({
  businessId,
  access,
  accessLoading,
  canUpdate,
  onManageAccess,
  onRecordPayment,
}: {
  businessId: string;
  access?: BusinessAccess | null;
  accessLoading?: boolean;
  canUpdate: boolean;
  onManageAccess: () => void;
  onRecordPayment: () => void;
}) {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState("all");
  const [subscriptionStatus, setSubscriptionStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const listFilters: ListSubscriptionEventsQuery = {
    eventType:
      eventType !== "all"
        ? (eventType as BusinessSubscriptionEventType)
        : undefined,
    subscriptionStatus:
      subscriptionStatus !== "all"
        ? (subscriptionStatus as SubscriptionAccessStatus)
        : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    limit: PAGE_LIMIT,
  };

  const {
    data,
    isLoading: eventsLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.platform.businesses.subscriptionEvents(
      businessId,
      listFilters as Record<string, string | number | boolean | null | undefined>,
    ),
    queryFn: ({ pageParam }) =>
      listPlatformBusinessSubscriptionEvents(businessId, {
        ...listFilters,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });

  const events = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const lastEvent = events[0] ?? null;

  const invalidateSubscriptionData = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.access(businessId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.subscriptionEvents(businessId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.detail(businessId),
    });
  };

  const handleMoreAction = (action: SubscriptionActionDefinition) => {
    if (
      action.key === "CHANGE_PACKAGE" ||
      action.key === "MARK_PAID" ||
      action.key === "EXTEND_TRIAL" ||
      action.key === "MANUAL_ADJUSTMENT" ||
      action.key === "SYNC_CAPABILITIES" ||
      action.key === "CHANGE_SNAPSHOT" ||
      action.key === "REACTIVATE_BUSINESS" ||
      action.key === "SUSPEND_BUSINESS" ||
      action.key === "CANCEL_SUBSCRIPTION" ||
      action.key === "EXPIRE_TRIAL" ||
      action.key === "MOVE_PENDING"
    ) {
      onManageAccess();
    }
  };

  const resetFilters = () => {
    setEventType("all");
    setSubscriptionStatus("all");
    setFromDate("");
    setToDate("");
  };

  const openEvent = (event: BusinessSubscriptionEventListItem) => {
    setSelectedEventId(event.id);
  };

  const columns = useMemo<DataTableColumn<BusinessSubscriptionEventListItem>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        sortable: true,
        sortValue: (row) => row.createdAt,
        cell: (row) => (
          <span className="whitespace-nowrap">
            {new Date(row.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "planTier",
        header: "Plan / Tier",
        sortable: true,
        sortValue: (row) => row.planTierLabel ?? "",
        cell: (row) => row.planTierLabel ?? "—",
      },
      {
        id: "event",
        header: "Event",
        sortable: true,
        sortValue: (row) => row.title,
        cell: (row) => (
          <button
            type="button"
            className="max-w-[280px] truncate text-left text-primary hover:underline"
            onClick={() => openEvent(row)}
          >
            {formatSubscriptionEventLabel(row)}
          </button>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.statusTransition ?? "",
        cell: (row) => row.statusTransition ?? "—",
      },
      {
        id: "payment",
        header: "Payment",
        cell: (row) => row.paymentSnippet ?? "—",
      },
      {
        id: "actor",
        header: "Actor",
        cell: (row) => row.createdByNameSnapshot ?? "—",
      },
      {
        id: "notes",
        header: "Notes",
        cell: (row) => (
          <span className="max-w-[160px] truncate block">
            {row.notes ?? "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-10">
      <SubscriptionOverviewSection
        access={access}
        canUpdate={canUpdate}
        isLoading={accessLoading}
        lastEvent={lastEvent}
        onManageAccess={onManageAccess}
        onRecordPayment={onRecordPayment}
        onPackageChanged={invalidateSubscriptionData}
        onAction={handleMoreAction}
      />

      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Subscription History</h3>
          <p className="text-sm text-muted-foreground">
            Lifecycle events for this business. Open an event for before/after
            state details.
          </p>
        </div>

        <FilterBar>
          <SearchableSelect
            items={subscriptionEventTypeFilterOptions}
            value={eventType}
            onValueChange={(v) => setEventType(v ?? "all")}
            placeholder="Event type"
            triggerClassName="w-[180px]"
          />
          <SearchableSelect
            items={subscriptionStatusFilterOptions}
            value={subscriptionStatus}
            onValueChange={(v) => setSubscriptionStatus(v ?? "all")}
            placeholder="Status"
            triggerClassName="w-[180px]"
          />
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[160px]"
            aria-label="From date"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[160px]"
            aria-label="To date"
          />
          <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
            Clear
          </Button>
        </FilterBar>

        <DataTable
          columns={columns}
          data={events}
          getRowId={(row) => row.id}
          isLoading={eventsLoading && events.length === 0}
          emptyTitle="No subscription events"
          emptyDescription="Subscription lifecycle events will appear here."
          rowActions={(row) => (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openEvent(row)}
            >
              View
            </Button>
          )}
          actionsColumnHeader="Actions"
        />

        {hasNextPage ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </div>

      <SubscriptionEventDetailDrawer
        businessId={businessId}
        eventId={selectedEventId}
        open={!!selectedEventId}
        onOpenChange={(open) => !open && setSelectedEventId(null)}
      />
    </div>
  );
}
