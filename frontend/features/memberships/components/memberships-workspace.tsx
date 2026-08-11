"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  LayoutTemplate,
  Plus,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { DataTable } from "@/components/data-display/data-table";
import { ListPagination } from "@/components/ui/list-pagination";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityDetailFooter } from "@/components/layout/entity-detail-footer";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
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

  async function handleExport() {
    try {
      const blob = await exportClientMemberships(filters);
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
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Options"
              onClick={() => setOptionsOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
            </Button>
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
                <p className="text-sm text-muted-foreground">Loading plans…</p>
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

      <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v ?? "all_except_canceled");
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_except_canceled">
                    All (except canceled)
                  </SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="PAST_DUE">Past due</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="CANCELED">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Membership plan</Label>
              <Select
                value={planFilter}
                onValueChange={(v) => {
                  setPlanFilter(v ?? "all");
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(plansQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label className="font-normal">Show different versions only</Label>
              <Switch
                checked={showDifferentVersionsOnly}
                onCheckedChange={(checked) => {
                  setShowDifferentVersionsOnly(checked);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label className="font-normal">Show older unpaid (over 1 month)</Label>
              <Switch
                checked={showOlderUnpaid}
                onCheckedChange={(checked) => {
                  setShowOlderUnpaid(checked);
                  setPage(1);
                }}
              />
            </div>
            <Button variant="outline" className="w-full" onClick={handleExport}>
              <Download className="mr-1.5 size-4" />
              Download CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
