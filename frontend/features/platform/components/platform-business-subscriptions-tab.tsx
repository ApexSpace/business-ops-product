"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { type DataTableColumn } from "@/components/data-display/data-table";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListFilterCheckboxGroup } from "@/components/layout/list-filter-checkbox-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubscriptionEventDetailDrawer } from "@/features/platform/components/access/subscription-event-detail-drawer";
import { useSubscriptionActionDialogs } from "@/features/platform/components/access/subscription-action-dialogs";
import { SubscriptionOverviewSection } from "@/features/platform/components/access/subscription-overview-section";
import { listPlatformBusinessSubscriptionEvents } from "@/features/platform/api/business-access.api";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import type { SubscriptionAccessStatus } from "@/features/platform/types/business-access";
import type {
  BusinessSubscriptionEventListItem,
  BusinessSubscriptionEventType,
  ListSubscriptionEventsQuery,
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftEventType, setDraftEventType] = useState("all");
  const [draftSubscriptionStatus, setDraftSubscriptionStatus] = useState("all");
  const [draftFromDate, setDraftFromDate] = useState("");
  const [draftToDate, setDraftToDate] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [historyAccordionOpen, setHistoryAccordionOpen] = useState<string[]>(
    [],
  );

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

  const actionDialogs = useSubscriptionActionDialogs({
    businessId,
    access,
    onSuccess: invalidateSubscriptionData,
    onRecordPayment,
  });

  const resetFilters = () => {
    setEventType("all");
    setSubscriptionStatus("all");
    setFromDate("");
    setToDate("");
    setDraftEventType("all");
    setDraftSubscriptionStatus("all");
    setDraftFromDate("");
    setDraftToDate("");
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
        cell: (row) => row.planTierLabel ?? "",
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
        cell: (row) => row.statusTransition ?? "",
      },
      {
        id: "payment",
        header: "Payment",
        cell: (row) => row.paymentSnippet ?? "",
      },
      {
        id: "actor",
        header: "Actor",
        cell: (row) => row.createdByNameSnapshot ?? "",
      },
      {
        id: "notes",
        header: "Notes",
        cell: (row) => (
          <span className="max-w-[160px] truncate block">
            {row.notes ?? ""}
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
        onManageAccess={onManageAccess}
        onPackageChanged={invalidateSubscriptionData}
        onAction={access ? actionDialogs.handleAction : undefined}
        actionBarLoading={actionDialogs.isLoading}
      />

      {actionDialogs.dialogs}

      <Accordion
        value={historyAccordionOpen}
        onValueChange={setHistoryAccordionOpen}
        className="rounded-lg border px-4"
      >
        <AccordionItem value="subscription-history">
          <AccordionTrigger className="py-3 hover:no-underline">
            <span className="font-medium">Subscription History</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p className="text-sm text-muted-foreground">
              Lifecycle events for this business. Open an event for before/after
              state details.
            </p>

            <EntityListLayout
              title="Subscription history"
              hideHeader
              flush
              filterAriaLabel="History filters"
              filterActive={
                eventType !== "all" ||
                subscriptionStatus !== "all" ||
                Boolean(fromDate || toDate)
              }
              filterOpen={filterOpen}
              onFilterOpenChange={(open) => {
                if (open) {
                  setDraftEventType(eventType);
                  setDraftSubscriptionStatus(subscriptionStatus);
                  setDraftFromDate(fromDate);
                  setDraftToDate(toDate);
                }
                setFilterOpen(open);
              }}
              filterContent={
                <>
                  <ListFilterCheckboxGroup
                    legend="Event type"
                    options={subscriptionEventTypeFilterOptions}
                    value={draftEventType}
                    onChange={(next) => setDraftEventType(String(next))}
                  />
                  <ListFilterCheckboxGroup
                    legend="Status"
                    options={subscriptionStatusFilterOptions}
                    value={draftSubscriptionStatus}
                    onChange={(next) =>
                      setDraftSubscriptionStatus(String(next))
                    }
                  />
                  <div className="flex w-full min-w-0 flex-col gap-2">
                    <Input
                      type="date"
                      value={draftFromDate}
                      onChange={(e) => setDraftFromDate(e.target.value)}
                      aria-label="From date"
                    />
                    <Input
                      type="date"
                      value={draftToDate}
                      onChange={(e) => setDraftToDate(e.target.value)}
                      aria-label="To date"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                    >
                      Clear
                    </Button>
                  </div>
                </>
              }
              onFilterApply={() => {
                setEventType(draftEventType);
                setSubscriptionStatus(draftSubscriptionStatus);
                setFromDate(draftFromDate);
                setToDate(draftToDate);
              }}
              footer={
                hasNextPage ? (
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
                ) : undefined
              }
              columns={columns}
              data={events}
              getRowId={(row) => row.id}
              isLoading={eventsLoading && events.length === 0}
              emptyTitle="No subscription events"
              emptyDescription="Subscription lifecycle events will appear here."
              actionsColumnHeader="Actions"
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
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <SubscriptionEventDetailDrawer
        businessId={businessId}
        eventId={selectedEventId}
        open={!!selectedEventId}
        onOpenChange={(open) => !open && setSelectedEventId(null)}
      />
    </div>
  );
}
