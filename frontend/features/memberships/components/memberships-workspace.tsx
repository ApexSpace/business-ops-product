"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
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
import { EmptyState } from "@/components/data-display/empty-state";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
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
  const isMobile = useIsMobile();

  const selectedId = searchParams.get("selected");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all_except_canceled");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [showDifferentVersionsOnly, setShowDifferentVersionsOnly] =
    useState(false);
  const [showOlderUnpaid, setShowOlderUnpaid] = useState(false);

  const filters = {
    search: search || undefined,
    status: statusFilter as ClientMembershipStatus | "all_except_canceled",
    planId: planFilter === "all" ? undefined : planFilter,
    ...(showDifferentVersionsOnly ? { showDifferentVersionsOnly: true } : {}),
    ...(showOlderUnpaid ? { showOlderUnpaid: true } : {}),
  };

  const setSelectedId = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("selected", id);
    } else {
      params.delete("selected");
    }
    const qs = params.toString();
    router.replace(
      qs ? `/business/memberships?${qs}` : "/business/memberships",
      { scroll: false },
    );
  };

  const listQuery = useQuery({
    queryKey: queryKeys.memberships.clientList(filters),
    queryFn: () => listClientMemberships(filters),
  });

  const memberships = listQuery.data ?? [];

  useEffect(() => {
    if (!selectedId && memberships.length > 0 && !isMobile) {
      setSelectedId(memberships[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-select on first load
  }, [memberships, selectedId, isMobile]);

  const detailQuery = useQuery({
    queryKey: queryKeys.memberships.clientDetail(selectedId ?? ""),
    queryFn: () => getClientMembership(selectedId!),
    enabled: !!selectedId,
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-[var(--page-padding-x)] pb-[var(--page-padding-y)] pt-[var(--page-content-top-gap)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:grid-rows-1">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-xs">
          <ListToolbar
            className="rounded-none border-0 border-b bg-transparent p-3 shadow-none sm:px-4"
            search={
              <Input
                placeholder="Search by client or plan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1"
              />
            }
            actions={
              <>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="sm:hidden"
                  aria-label="Manage plans"
                  onClick={() => router.push("/business/memberships/plans")}
                >
                  <LayoutTemplate className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden shrink-0 sm:inline-flex"
                  onClick={() => router.push("/business/memberships/plans")}
                >
                  <LayoutTemplate className="mr-1.5 size-4" />
                  Manage plans
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="sm:hidden"
                  aria-label="Settings"
                  onClick={() => router.push("/business/memberships/settings")}
                >
                  <Settings className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden shrink-0 sm:inline-flex"
                  onClick={() => router.push("/business/memberships/settings")}
                >
                  <Settings className="mr-1.5 size-4" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Options"
                  onClick={() => setOptionsOpen(true)}
                >
                  <SlidersHorizontal className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  className="sm:hidden"
                  aria-label="New membership"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  size="sm"
                  className="hidden shrink-0 sm:inline-flex"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="mr-1.5 size-4" />
                  New membership
                </Button>
              </>
            }
          />

          {listQuery.isError ? (
            <ApiErrorState
              error={listQuery.error}
              onRetry={() => void listQuery.refetch()}
            />
          ) : listQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">
              Loading memberships…
            </p>
          ) : memberships.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={
                  <Crown className="size-5 text-muted-foreground/70" aria-hidden />
                }
                title="No memberships found"
                description="Start a membership for a client or adjust your filters."
                action={
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="mr-1.5 size-4" />
                    New membership
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DataTable
                  columns={columns}
                  data={memberships}
                  getRowId={(row) => row.id}
                  activeRowId={selectedId}
                  onRowClick={(row) => setSelectedId(row.id)}
                  getRowClassName={(row) =>
                    selectedId === row.id
                      ? "shadow-[inset_3px_0_0_0_var(--color-primary)]"
                      : undefined
                  }
                  className="rounded-none border-0 shadow-none"
                />
              </div>
              <div className="shrink-0 border-t border-border px-4 py-3 text-sm text-muted-foreground">
                {memberships.length} membership
                {memberships.length === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </section>

        {!isMobile ? (
          <MembershipDetailPanel
            {...detailPanelProps}
            className="min-h-0 max-lg:hidden"
          />
        ) : null}
      </div>

      {isMobile ? (
        <Sheet
          open={!!selectedId}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
        >
          <SheetContent
            side="right"
            className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col border-l-0 bg-background p-0 shadow-none"
            showCloseButton
          >
            <SheetBody className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <MembershipDetailPanel
                {...detailPanelProps}
                variant="drawer"
                className="min-h-0 flex-1 rounded-none border-0 shadow-none"
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
              <SearchableSelect
                items={planOptions}
                value={planId}
                onValueChange={setPlanId}
                placeholder="Select a plan"
                inDialog
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!contactId || !planId || createMutation.isPending}
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
                onValueChange={(v) =>
                  setStatusFilter(v ?? "all_except_canceled")
                }
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
                onValueChange={(v) => setPlanFilter(v ?? "all")}
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
                onCheckedChange={setShowDifferentVersionsOnly}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label className="font-normal">Show older unpaid (over 1 month)</Label>
              <Switch
                checked={showOlderUnpaid}
                onCheckedChange={setShowOlderUnpaid}
              />
            </div>
            <Button variant="outline" className="w-full" onClick={handleExport}>
              <Download className="mr-1.5 size-4" />
              Download CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
