"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutTemplate,
  Plus,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { DataTable } from "@/components/data-display/data-table";
import { ListPagination } from "@/components/ui/list-pagination";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityDetailFooter } from "@/components/layout/entity-detail-footer";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { ListFilterButton } from "@/components/layout/list-filter-button";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { LoadingState } from "@/components/data-display/loading-state";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MembershipsOptionsDrawer } from "@/features/memberships/components/memberships-options-drawer";
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { queryKeys } from "@/lib/query/keys";
import { invalidateMemberships } from "@/lib/query/invalidation";
import { listContacts } from "@/features/contacts/api/contacts.api";
import {
  createClientMembership,
  exportClientMemberships,
  getClientMembership,
  listClientMemberships,
  listMembershipPlans,
  updateClientMembership,
} from "@/features/memberships/api/memberships.api";
import {
  MembershipDetailPanel,
  MembershipStatusBadge,
  formatMembershipPrice,
  membershipPlanLabel,
} from "@/features/memberships/components/membership-detail-panel";
import { MembershipsMobileList } from "@/features/memberships/components/mobile/memberships-mobile-list";
import { useMembershipStaffPermissions } from "@/features/memberships/hooks/use-membership-staff-permissions";
import type {
  ClientMembershipListItem,
  ClientMembershipStatus,
} from "@/features/memberships/types";

function formatListDate(value: string) {
  return DateTime.fromISO(value).toFormat("MMMM d");
}

export function MembershipsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { canManage } = useMembershipStaffPermissions();
  const isMobile = useIsMobile();
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection({ legacyIdParams: ["selected"] });

  // Deep link from contact details: ?contact=<contactId> means "start membership
  // for this client", not "open membership detail" (contact is also a legacy
  // entity-selection param).
  const contactFilter = searchParams.get("contact");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [contactId, setContactId] = useState<string | null>(
    () => contactFilter,
  );
  const [planId, setPlanId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all_except_canceled");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [showDifferentVersionsOnly, setShowDifferentVersionsOnly] =
    useState(false);
  const [showOlderUnpaid, setShowOlderUnpaid] = useState(false);

  useEffect(() => {
    if (contactFilter && selectedId === contactFilter) {
      clearSelection();
    }
  }, [contactFilter, selectedId, clearSelection]);

  useEffect(() => {
    if (contactFilter && canManage) {
      setContactId(contactFilter);
      setAddOpen(true);
    }
  }, [contactFilter, canManage]);

  const filters = {
    page,
    limit: 25,
    search: search || undefined,
    status: statusFilter as ClientMembershipStatus | "all_except_canceled",
    planId: planFilter === "all" ? undefined : planFilter,
    ...(showDifferentVersionsOnly ? { showDifferentVersionsOnly: true } : {}),
    ...(showOlderUnpaid ? { showOlderUnpaid: true } : {}),
  };

  const listQuery = useQuery({
    queryKey: queryKeys.memberships.clientList(filters),
    queryFn: () => listClientMemberships(filters),
  });

  const memberships = listQuery.data?.items ?? [];

  const detailQuery = useQuery({
    queryKey: queryKeys.memberships.clientDetail(selectedId ?? ""),
    queryFn: () => getClientMembership(selectedId!),
    enabled: !!selectedId && selectedId !== contactFilter,
  });

  const plansQuery = useQuery({
    queryKey: queryKeys.memberships.plans(),
    queryFn: () => listMembershipPlans(),
    enabled: addOpen || optionsOpen,
  });

  const contactsQuery = useQuery({
    queryKey: ["contacts", "picker", addOpen],
    queryFn: () => listContacts({ page: 1, limit: 100 }),
    enabled: addOpen,
  });

  const contactOptions = useMemo(
    () =>
      (contactsQuery.data?.items ?? []).map((c) => ({
        value: c.id,
        label:
          c.displayName?.trim() ||
          [c.firstName, c.lastName].filter(Boolean).join(" ") ||
          c.email ||
          "Unknown",
      })),
    [contactsQuery.data],
  );

  const planOptions = useMemo(
    () =>
      (plansQuery.data ?? [])
        .filter((p) => !p.isArchived)
        .map((p) => ({
          value: p.id,
          label: `${p.emoji ?? ""} ${p.name}`.trim(),
        })),
    [plansQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: createClientMembership,
    onSuccess: async (row) => {
      toast.success("Membership started");
      setAddOpen(false);
      await invalidateMemberships(queryClient);
      setSelectedId(row.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actionMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "pause" | "resume" | "cancel";
    }) => updateClientMembership(id, { action }),
    onSuccess: async () => {
      toast.success("Membership updated");
      await invalidateMemberships(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleExport(override?: {
    status: string;
    planId: string;
    showDifferentVersionsOnly: boolean;
    showOlderUnpaid: boolean;
  }) {
    const exportFilters = override
      ? {
          page: 1,
          limit: 25,
          search: search || undefined,
          status: override.status as ClientMembershipStatus | "all_except_canceled",
          planId: override.planId === "all" ? undefined : override.planId,
          ...(override.showDifferentVersionsOnly
            ? { showDifferentVersionsOnly: true }
            : {}),
          ...(override.showOlderUnpaid ? { showOlderUnpaid: true } : {}),
        }
      : filters;
    try {
      const blob = await exportClientMemberships(exportFilters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "client-memberships.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  const columns = useMemo(
    () => [
      {
        id: "client",
        header: "Client",
        cell: (row: ClientMembershipListItem) => (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/business/contacts?contact=${row.contact.id}`);
            }}
          >
            {row.contact.name}
          </button>
        ),
      },
      {
        id: "plan",
        header: "Plan",
        cell: (row: ClientMembershipListItem) => membershipPlanLabel(row),
      },
      {
        id: "startDate",
        header: "Start date",
        cell: (row: ClientMembershipListItem) => (
          <span className="text-muted-foreground">
            {formatListDate(row.startDate)}
          </span>
        ),
      },
      {
        id: "price",
        header: "Price",
        cell: (row: ClientMembershipListItem) => (
          <span className="tabular-nums">
            {formatMembershipPrice(row.price, row.billingIntervalUnit)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row: ClientMembershipListItem) => (
          <MembershipStatusBadge status={row.status} />
        ),
      },
    ],
    [router],
  );

  const detail = detailQuery.data;
  // Don't treat ?contact=<contactId> as an open membership detail drawer.
  const drawerOpen = isOpen && selectedId !== contactFilter;

  const detailPanelProps = {
    selectedId,
    detail,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    onRetry: () => void detailQuery.refetch(),
    onPause: () => {
      if (!detail) return;
      actionMutation.mutate({ id: detail.id, action: "pause" });
    },
    onResume: () => {
      if (!detail) return;
      actionMutation.mutate({ id: detail.id, action: "resume" });
    },
    onCancel: () => {
      if (!detail) return;
      actionMutation.mutate({ id: detail.id, action: "cancel" });
    },
    actionPending: actionMutation.isPending,
    onOpenContact: (contactId: string) => {
      router.push(`/business/contacts?contact=${contactId}`);
    },
  };

  return (
    <>
      {isMobile ? (
        listQuery.isError ? (
          <ApiErrorState
            error={listQuery.error}
            onRetry={() => void listQuery.refetch()}
          />
        ) : (
          <MembershipsMobileList
            memberships={memberships}
            isLoading={listQuery.isLoading}
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            selectedId={drawerOpen ? selectedId : null}
            onSelect={(row) => setSelectedId(row.id)}
            onOpenOptions={() => setOptionsOpen(true)}
            onCreate={canManage ? () => setAddOpen(true) : undefined}
            canCreate={canManage}
            pagination={
              listQuery.data?.meta && memberships.length > 0
                ? {
                    meta: listQuery.data.meta,
                    page,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        )
      ) : (
      <EntityWorkspaceLayout
        title="Memberships"
        description="Manage client subscriptions and billing."
        search={
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search by client or plan…"
            className="min-w-0 flex-1"
          />
        }
        filters={
          <ListFilterButton
            aria-label="Membership options"
            onClick={() => setOptionsOpen(true)}
          />
        }
        actions={
          <>
            {canManage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/business/memberships/plans")}
              >
                <LayoutTemplate className="mr-1.5 size-4" />
                Manage plans
              </Button>
            ) : null}
            {canManage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/business/memberships/settings")}
              >
                <Settings className="mr-1.5 size-4" />
                Settings
              </Button>
            ) : null}
            {canManage ? (
              <ListPrimaryAction
                label="New Membership"
                onClick={() => setAddOpen(true)}
              />
            ) : null}
          </>
        }
        footer={
          listQuery.data?.meta && memberships.length > 0 ? (
            <ListPagination
              meta={listQuery.data.meta}
              page={page}
              onPageChange={setPage}
              label="memberships"
              compact
            />
          ) : undefined
        }
      >
        {listQuery.isError ? (
          <ApiErrorState
            error={listQuery.error}
            onRetry={() => void listQuery.refetch()}
          />
        ) : (
          <DataTable
            columns={columns}
            data={memberships}
            getRowId={(row) => row.id}
            isLoading={listQuery.isLoading}
            density="compact"
            activeRowId={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
            getRowClassName={(row) =>
              selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
            }
            emptyTitle="No memberships found"
            emptyDescription="Start a membership for a client or adjust your filters."
            emptyAction={
              canManage ? (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1.5 size-4" />
                  New membership
                </Button>
              ) : undefined
            }
            className={WORKSPACE_TABLE_CLASS}
          />
        )}
      </EntityWorkspaceLayout>
      )}

      <EntityDetailDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        width="standard"
        title={detail ? membershipPlanLabel(detail) : "Membership"}
        subtitle={detail?.contact.name}
        isLoading={drawerOpen && detailQuery.isLoading}
        badges={
          detail ? <MembershipStatusBadge status={detail.status} /> : null
        }
        footer={
          canManage && detail ? (
            <EntityDetailFooter className="flex-col sm:flex-row">
              {detail.status === "ACTIVE" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={actionMutation.isPending}
                  onClick={detailPanelProps.onPause}
                >
                  Pause membership
                </Button>
              ) : null}
              {detail.status === "PAUSED" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={actionMutation.isPending}
                  onClick={detailPanelProps.onResume}
                >
                  Resume membership
                </Button>
              ) : null}
              {detail.status !== "CANCELED" ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={actionMutation.isPending}
                  onClick={detailPanelProps.onCancel}
                >
                  Cancel membership
                </Button>
              ) : null}
            </EntityDetailFooter>
          ) : null
        }
      >
        {drawerOpen && detail ? (
          <MembershipDetailPanel {...detailPanelProps} embedded />
        ) : drawerOpen && !detailQuery.isLoading ? (
          <ApiErrorState
            error={
              detailQuery.error ??
              new Error("This membership could not be found.")
            }
            onRetry={() => void detailQuery.refetch()}
          />
        ) : null}
      </EntityDetailDrawer>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setPlanId(null);
            if (!contactFilter) setContactId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <SearchableSelect
                items={contactOptions}
                value={contactId}
                onValueChange={setContactId}
                placeholder="Search for client"
                inDialog
              />
            </div>
            <div className="space-y-1.5">
              <Label>Membership plan</Label>
              {plansQuery.isLoading ? (
                <LoadingState variant="inline" label="Loading plans…" />
              ) : planOptions.length === 0 ? (
                <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      No membership plans available
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Create a plan first, then you can start a membership for
                      this client.
                    </p>
                  </div>
                  {canManage ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddOpen(false);
                        router.push("/business/memberships/plans");
                      }}
                    >
                      <LayoutTemplate className="mr-1.5 size-4" />
                      Manage plans
                    </Button>
                  ) : null}
                </div>
              ) : (
                <SearchableSelect
                  items={planOptions}
                  value={planId}
                  onValueChange={setPlanId}
                  placeholder="Select a plan"
                  inDialog
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !contactId ||
                !planId ||
                planOptions.length === 0 ||
                createMutation.isPending
              }
              onClick={() =>
                createMutation.mutate({
                  contactId: contactId!,
                  planId: planId!,
                })
              }
            >
              Start membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MembershipsOptionsDrawer
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        values={{
          status: statusFilter,
          planId: planFilter,
          showDifferentVersionsOnly,
          showOlderUnpaid,
        }}
        plans={(plansQuery.data ?? []).map((p) => ({ id: p.id, name: p.name }))}
        onApply={(next) => {
          setStatusFilter(next.status);
          setPlanFilter(next.planId);
          setShowDifferentVersionsOnly(next.showDifferentVersionsOnly);
          setShowOlderUnpaid(next.showOlderUnpaid);
          setPage(1);
        }}
        onDownload={(next) => void handleExport(next)}
      />
    </>
  );
}
