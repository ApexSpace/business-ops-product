"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DataTableColumn } from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { resolveNavEntityLabels } from "@/lib/snapshot/resolve-terminology";
import { useSnapshotContext } from "@/lib/snapshot/use-snapshot-context";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { useWorkItemsList } from "@/features/work-items/hooks/use-work-items-list";
import { useWorkItemsHost } from "@/features/work-items/work-items-host-context";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { listServices } from "@/features/settings/api/services.api";
import { queryKeys } from "@/lib/query/keys";
import {
  formatWorkItemAmount,
  formatWorkItemScheduledAt,
  WORK_ITEM_STATUS_OPTIONS,
} from "@/features/work-items/schemas/work-item-profile";
import type { WorkItemsView } from "@/features/work-items/components/work-items-view-switcher";
import type { WorkItem } from "@/features/work-items/types";

export const WORK_ITEMS_LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
  status: { default: "" },
  serviceId: { default: "" },
  assignedToId: { default: "" },
  view: { default: "board" },
} as const;

export const WORK_ITEMS_TABLE_PAGE_LIMIT = 20;
export const WORK_ITEMS_BOARD_PAGE_LIMIT = 100;

export const workItemsStatusFilterItems = [
  { value: "", label: "All statuses" },
  ...WORK_ITEM_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

export function useWorkItemsPageToolbar() {
  const { apiBase, servicesApiBase = "services", membersApiBase, mode } = useWorkItemsHost();
  const { params, page, setParams } = useListSearchParams(WORK_ITEMS_LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);

  const view: WorkItemsView = params.view === "table" ? "table" : "board";
  const isBoardView = view === "board";
  const listPage = isBoardView ? 1 : page;
  const listLimit = isBoardView
    ? WORK_ITEMS_BOARD_PAGE_LIMIT
    : WORK_ITEMS_TABLE_PAGE_LIMIT;

  const { context: snapshotContext } = useSnapshotContext();
  const labels = resolveNavEntityLabels(snapshotContext.terminology);
  const workItemsLabel =
    mode === "platform" ? "Work Items" : labels.workItems;

  const listFilters = {
    page: listPage,
    limit: listLimit,
    search: debouncedSearch || undefined,
    status: params.status || undefined,
    serviceId: mode !== "platform" ? params.serviceId || undefined : undefined,
    assignedToId: params.assignedToId || undefined,
    view,
  };

  const listQueryKey = queryKeys.workItems.list(apiBase, listFilters);

  const { data, isLoading } = useWorkItemsList({
    page: listPage,
    limit: listLimit,
    search: debouncedSearch || undefined,
    status: params.status || undefined,
    serviceId: params.serviceId || undefined,
    assignedToId: params.assignedToId || undefined,
  });

  const { data: services } = useQuery({
    queryKey: queryKeys.services.picker(servicesApiBase),
    queryFn: () =>
      listServices({ page: 1, limit: 100, status: "ACTIVE" }, servicesApiBase),
    enabled: mode !== "platform",
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }, membersApiBase),
    queryFn: () =>
      listBusinessMembers({ page: 1, limit: 100 }, membersApiBase),
  });

  const serviceFilterItems = useMemo(
    () =>
      mode === "platform"
        ? []
        : [
            { value: "", label: "All services" },
            ...(services?.items.map((s) => ({
              value: s.id,
              label: s.category ? `${s.name} (${s.category})` : s.name,
            })) ?? []),
          ],
    [services?.items, mode],
  );

  const assigneeFilterItems = useMemo(
    () => [
      { value: "", label: mode === "platform" ? "All support" : "All staff" },
      ...(members?.items.map((m) => ({
        value: m.user.id,
        label:
          [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
          m.user.email,
      })) ?? []),
    ],
    [members?.items, mode],
  );

  const columns = useMemo<DataTableColumn<WorkItem>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        sortable: true,
        sortValue: (row) => row.title,
        cell: (row) => <span className="font-medium">{row.title}</span>,
      },
      {
        id: "contact",
        header:
          mode === "platform"
            ? "Customer"
            : labels.contacts.replace(/s$/, "") || "Customer",
        sortable: true,
        sortValue: (row) => row.contact?.label ?? "",
        cell: (row) => row.contact?.label ?? "—",
      },
      ...(mode !== "platform"
        ? [
            {
              id: "service",
              header: "Service",
              cell: (row: WorkItem) => row.service?.name ?? "—",
            },
          ]
        : []),
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <StatusBadge status={row.status} domain="workItem" />
        ),
      },
      {
        id: "scheduled",
        header: "Scheduled",
        sortable: true,
        sortValue: (row) => row.scheduledAt ?? "",
        cell: (row) => formatWorkItemScheduledAt(row.scheduledAt) ?? "—",
      },
      {
        id: "amount",
        header: "Amount",
        cell: (row) => formatWorkItemAmount(row.amount) ?? "—",
      },
    ],
    [labels.contacts, mode],
  );

  const countSingular =
    workItemsLabel.toLowerCase().replace(/s$/, "") || "item";
  const countPlural = workItemsLabel.toLowerCase();

  return {
    params,
    page,
    setParams,
    view,
    isBoardView,
    workItemsLabel,
    listQueryKey,
    data,
    isLoading,
    columns,
    serviceFilterItems,
    assigneeFilterItems,
    countSingular,
    countPlural,
  };
}
