"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BusinessListSubscriptionActions } from "@/features/platform/components/business-list-subscription-actions";
import { toast } from "sonner";
import { CreateBusinessWizard } from "@/features/platform/components/create-business-wizard";
import { EditBusinessDialog } from "@/features/platform/components/edit-business-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import {
  DataTableRowActions,
  type RowAction,
} from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ListPagination } from "@/components/ui/list-pagination";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  deletePlatformBusiness,
  listPlatformBusinesses,
} from "@/features/platform/api/platform.api";
import { listPlatformPlanGroups, listPlatformPlanGroupTiers } from "@/features/platform/api/plan-groups.api";
import { formatPaymentMethod } from "@/features/platform/utils/access-labels";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { formatNeedsAttentionFlag } from "@/features/platform/utils/access-labels";
import { invalidatePlatformBusinesses } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import {
  businessStatusFilterOptions,
  subscriptionPaymentStatusFilterOptions,
  subscriptionStatusFilterOptions,
} from "@/features/platform/utils/select-options";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import type { Business } from "@/features/platform/types";

const LIST_SCHEMA = {
  page: { default: "1" },
  status: { default: "all" },
  subscriptionStatus: { default: "all" },
  paymentStatus: { default: "all" },
  planGroupId: { default: "all" },
  planTierId: { default: "all" },
  canAccess: { default: "all" },
  needsAttention: { default: "all" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function formatPeriodEnd(row: Business): string {
  if (row.subscriptionStatus === "TRIALING" && row.currentPeriodEnd) {
    return new Date(row.currentPeriodEnd).toLocaleDateString();
  }
  if (row.currentPeriodEnd) {
    return new Date(row.currentPeriodEnd).toLocaleDateString();
  }
  return "—";
}

function PlatformBusinessesPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [editing, setEditing] = useState<Business | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);

  const status = params.status;
  const subscriptionStatus = params.subscriptionStatus;
  const paymentStatus = params.paymentStatus;
  const planGroupId = params.planGroupId;
  const planTierId = params.planTierId;
  const canAccess = params.canAccess;
  const needsAttention = params.needsAttention;

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    status: status !== "all" ? status : undefined,
    subscriptionStatus:
      subscriptionStatus !== "all" ? subscriptionStatus : undefined,
    paymentStatus: paymentStatus !== "all" ? paymentStatus : undefined,
    planGroupId: planGroupId !== "all" ? planGroupId : undefined,
    planTierId: planTierId !== "all" ? planTierId : undefined,
    canAccess:
      canAccess === "true" ? true : canAccess === "false" ? false : undefined,
    needsAttention: needsAttention !== "all" ? needsAttention : undefined,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.list(listFilters),
    queryFn: () => listPlatformBusinesses(listFilters),
  });

  const { data: planGroups } = useQuery({
    queryKey: queryKeys.platform.planGroups.list({ status: "PUBLISHED", limit: 50 }),
    queryFn: () =>
      listPlatformPlanGroups({ page: 1, limit: 50, status: "PUBLISHED" }),
  });

  const planGroupFilterOptions = useMemo(
    () => [
      { value: "all", label: "All plan groups" },
      ...(planGroups?.items.map((g) => ({ value: g.id, label: g.name })) ?? []),
    ],
    [planGroups],
  );

  const { data: planTiers } = useQuery({
    queryKey: queryKeys.platform.planGroups.tiers(planGroupId !== "all" ? planGroupId : ""),
    queryFn: () => listPlatformPlanGroupTiers(planGroupId),
    enabled: planGroupId !== "all",
  });

  const planTierFilterOptions = useMemo(
    () => [
      { value: "all", label: "All plan tiers" },
      ...(planTiers?.map((t) => ({ value: t.id, label: t.name })) ?? []),
    ],
    [planTiers],
  );

  const accessFilterOptions = [
    { value: "all", label: "All access results" },
    { value: "true", label: "Can access" },
    { value: "false", label: "Cannot access" },
  ];

  const needsAttentionFilterOptions = [
    { value: "all", label: "Any attention" },
    { value: "TRIAL_EXPIRED", label: "Trial expired" },
    { value: "PENDING_PAYMENT", label: "Pending payment" },
    { value: "NO_PLAN_TIER", label: "No plan tier" },
    { value: "NO_CAPABILITIES", label: "No capabilities" },
    { value: "SNAPSHOT_NOT_APPLIED", label: "Snapshot not applied" },
  ];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlatformBusiness(id),
    onSuccess: () => {
      toast.success("Business deleted");
      void invalidatePlatformBusinesses(queryClient);
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canCreate = useCan(PERMISSIONS["platform.businesses.create"]);
  const canUpdate = useCan(PERMISSIONS["platform.businesses.update"]);
  const canDelete = useCan(PERMISSIONS["platform.businesses.delete"]);
  const showActions = canUpdate || canDelete;

  const columns = useMemo<DataTableColumn<Business>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <Link
            href={`/platform/businesses/${row.id}`}
            className="font-medium hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: "status",
        header: "Business",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <StatusBadge status={row.status} domain="business" />
        ),
      },
      {
        id: "accessResult",
        header: "Access Result",
        sortable: true,
        sortValue: (row) => (row.canAccessWorkspace ? "1" : "0"),
        cell: (row) => (
          <Badge variant={row.canAccessWorkspace ? "default" : "destructive"}>
            {row.canAccessWorkspace ? "Can access" : "Cannot access"}
          </Badge>
        ),
      },
      {
        id: "needsAttention",
        header: "Attention",
        cell: (row) =>
          row.needsAttention?.length ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="size-4 text-amber-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <ul className="space-y-1">
                    {row.needsAttention.map((flag) => (
                      <li key={flag}>{formatNeedsAttentionFlag(flag as never)}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "subscriptionStatus",
        header: "Subscription",
        sortable: true,
        sortValue: (row) => row.subscriptionStatus ?? "",
        cell: (row) =>
          row.subscriptionStatus ? (
            <StatusBadge status={row.subscriptionStatus} domain="subscription" />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "planGroup",
        header: "Plan group",
        sortable: true,
        sortValue: (row) => row.planGroupName ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.planGroupName ?? "—"}
          </span>
        ),
      },
      {
        id: "planTier",
        header: "Plan tier",
        sortable: true,
        sortValue: (row) => row.planTierName ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.planTierName ?? "—"}
          </span>
        ),
      },
      {
        id: "paymentMethod",
        header: "Method",
        sortable: true,
        sortValue: (row) => row.paymentMethod ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.paymentMethod
              ? formatPaymentMethod(row.paymentMethod as never)
              : "—"}
          </span>
        ),
      },
      {
        id: "paymentStatus",
        header: "Payment",
        sortable: true,
        sortValue: (row) => row.paymentStatus ?? "",
        cell: (row) =>
          row.paymentStatus ? (
            <StatusBadge status={row.paymentStatus} domain="subscriptionPayment" />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "latestPayment",
        header: "Latest payment",
        sortable: true,
        sortValue: (row) => row.latestPaymentAt ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.latestPaymentAt
              ? new Date(row.latestPaymentAt).toLocaleDateString()
              : "—"}
          </span>
        ),
      },
      {
        id: "periodEnd",
        header: "Trial / period end",
        sortable: true,
        sortValue: (row) => row.currentPeriodEnd ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">{formatPeriodEnd(row)}</span>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        sortable: true,
        sortValue: (row) => row.updatedAt,
        cell: (row) => (
          <span className="text-muted-foreground">
            {new Date(row.updatedAt).toLocaleDateString()}
          </span>
        ),
      },
      ...(canUpdate
        ? [
            {
              id: "subscriptionActions",
              header: "Actions",
              cell: (row: Business) => (
                <BusinessListSubscriptionActions
                  business={row}
                  onSuccess={() => void invalidatePlatformBusinesses(queryClient)}
                />
              ),
            } satisfies DataTableColumn<Business>,
          ]
        : []),
    ],
    [canUpdate, queryClient],
  );

  return (
    <>
      <ListPage
        title="Businesses"
        description="Manage all client businesses on the platform."
        actions={canCreate ? <CreateBusinessWizard /> : null}
        filters={
          <FilterBar>
            <SearchInput
              value={params.search}
              onChange={(value) =>
                setParams({ search: value, page: "1" }, { resetPage: true })
              }
              placeholder="Search businesses…"
            />
            <SearchableSelect
              items={businessStatusFilterOptions}
              value={status}
              onValueChange={(v) =>
                setParams({ status: v ?? "all", page: "1" }, { resetPage: true })
              }
              placeholder="Business status"
              triggerClassName="w-[180px]"
            />
            <SearchableSelect
              items={subscriptionStatusFilterOptions}
              value={subscriptionStatus}
              onValueChange={(v) =>
                setParams(
                  { subscriptionStatus: v ?? "all", page: "1" },
                  { resetPage: true },
                )
              }
              placeholder="Subscription"
              triggerClassName="w-[180px]"
            />
            <SearchableSelect
              items={subscriptionPaymentStatusFilterOptions}
              value={paymentStatus}
              onValueChange={(v) =>
                setParams(
                  { paymentStatus: v ?? "all", page: "1" },
                  { resetPage: true },
                )
              }
              placeholder="Payment"
              triggerClassName="w-[180px]"
            />
            <SearchableSelect
              items={planGroupFilterOptions}
              value={planGroupId}
              onValueChange={(v) =>
                setParams(
                  { planGroupId: v ?? "all", planTierId: "all", page: "1" },
                  { resetPage: true },
                )
              }
              placeholder="Plan group"
              triggerClassName="w-[180px]"
            />
            <SearchableSelect
              items={planTierFilterOptions}
              value={planTierId}
              onValueChange={(v) =>
                setParams(
                  { planTierId: v ?? "all", page: "1" },
                  { resetPage: true },
                )
              }
              placeholder="Plan tier"
              triggerClassName="w-[180px]"
              disabled={planGroupId === "all"}
            />
            <SearchableSelect
              items={accessFilterOptions}
              value={canAccess}
              onValueChange={(v) =>
                setParams(
                  { canAccess: v ?? "all", page: "1" },
                  { resetPage: true },
                )
              }
              placeholder="Access result"
              triggerClassName="w-[180px]"
            />
            <SearchableSelect
              items={needsAttentionFilterOptions}
              value={needsAttention}
              onValueChange={(v) =>
                setParams(
                  { needsAttention: v ?? "all", page: "1" },
                  { resetPage: true },
                )
              }
              placeholder="Needs attention"
              triggerClassName="w-[200px]"
            />
          </FilterBar>
        }
        pagination={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="businesses"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No businesses found"
          rowActions={
            showActions
              ? (business) => {
                  const actions: RowAction[] = [
                    {
                      label: "View",
                      onClick: () => router.push(`/platform/businesses/${business.id}`),
                    },
                  ];
                  if (canUpdate) {
                    actions.push({
                      label: "Edit",
                      onClick: () => setEditing(business),
                    });
                  }
                  if (canDelete) {
                    actions.push({
                      label: "Delete",
                      onClick: () => setDeleteTarget(business),
                      destructive: true,
                    });
                  }
                  return <DataTableRowActions actions={actions} />;
                }
              : (business) => (
                  <DataTableRowActions
                    actions={[
                      {
                        label: "View",
                        onClick: () => router.push(`/platform/businesses/${business.id}`),
                      },
                    ]}
                  />
                )
          }
        />
      </ListPage>

      <EditBusinessDialog
        business={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete business?"
        description={
          <>
            This will permanently delete <strong>{deleteTarget?.name}</strong>{" "}
            and all related data including members, contacts, leads, pipelines,
            and tags. This action cannot be undone.
          </>
        }
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteTarget && deleteMutation.mutate(deleteTarget.id)
        }
      />
    </>
  );
}

export function PlatformBusinessesPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PlatformBusinessesPageContent />
    </Suspense>
  );
}
