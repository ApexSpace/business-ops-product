"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutTemplate, Settings  } from "lucide-react";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { DataTable } from "@/components/data-display/data-table";
import { ListPagination } from "@/components/ui/list-pagination";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  WORKSPACE_ACTIVE_ROW_CLASS,
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { queryKeys } from "@/lib/query/keys";
import { invalidatePackages } from "@/lib/query/invalidation";
import { listContacts } from "@/features/contacts/api/contacts.api";
import {
  adjustClientPackageQuantities,
  createClientPackage,
  deleteClientPackage,
  getClientPackage,
  listClientPackages,
  listPackageTemplates,
  transferClientPackage,
  updateClientPackageExpiration,
} from "@/features/packages/api/packages.api";
import {
  PackageDetailPanel,
  packageDisplayName,
} from "@/features/packages/components/package-detail-panel";
import { PackagesMobileList } from "@/features/packages/components/mobile/packages-mobile-list";
import { usePackageStaffPermissions } from "@/features/packages/hooks/use-package-staff-permissions";
import type { ClientPackageListItem } from "@/features/packages/types";

function formatListDate(value: string) {
  return DateTime.fromISO(value).toFormat("MMMM d");
}

export function PackagesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { canManage } = usePackageStaffPermissions();
  const isMobile = useIsMobile();
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection({ legacyIdParams: ["selected"] });

  const contactFilter = searchParams.get("contact");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState(false);
  const [allocationDraft, setAllocationDraft] = useState<
    Record<string, number>
  >({});

  const [contactId, setContactId] = useState<string | null>(
    () => contactFilter,
  );
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [isDemo, setIsDemo] = useState(false);
  const [transferContactId, setTransferContactId] = useState<string | null>(
    null,
  );
  const [expirationDraft, setExpirationDraft] = useState("");
  const [expirationEditMode, setExpirationEditMode] = useState(false);

  useEffect(() => {
    if (contactFilter && selectedId === contactFilter) {
      clearSelection();
    }
  }, [contactFilter, selectedId, clearSelection]);

  useEffect(() => {
    if (contactFilter && canManage) {
      setAddOpen(true);
    }
  }, [contactFilter, canManage]);

  const listQuery = useQuery({
    queryKey: queryKeys.packages.clientList({
      search: search || undefined,
      page,
      limit: 25,
      contactId: contactFilter ?? undefined,
    }),
    queryFn: () =>
      listClientPackages({
        search: search || undefined,
        page,
        limit: 25,
        contactId: contactFilter ?? undefined,
      }),
  });

  const packages = listQuery.data?.items ?? [];

  const detailQuery = useQuery({
    queryKey: queryKeys.packages.clientDetail(selectedId ?? ""),
    queryFn: () => getClientPackage(selectedId!),
    enabled: !!selectedId,
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.packages.templates(),
    queryFn: listPackageTemplates,
    enabled: addOpen,
  });

  const contactsQuery = useQuery({
    queryKey: ["contacts", "picker", addOpen || transferOpen],
    queryFn: () => listContacts({ page: 1, limit: 100 }),
    enabled: addOpen || transferOpen,
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

  const templateOptions = useMemo(
    () =>
      (templatesQuery.data ?? []).map((t) => ({
        value: t.id,
        label: `${t.emoji ?? ""} ${t.name}`.trim(),
      })),
    [templatesQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: createClientPackage,
    onSuccess: async (pkg) => {
      toast.success("Package added");
      setAddOpen(false);
      await invalidatePackages(queryClient);
      setSelectedId(pkg.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClientPackage,
    onSuccess: async () => {
      toast.success("Package deleted");
      clearSelection();
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transferMutation = useMutation({
    mutationFn: ({
      id,
      targetContactId,
    }: {
      id: string;
      targetContactId: string;
    }) => transferClientPackage(id, targetContactId),
    onSuccess: async () => {
      toast.success("Package transferred");
      setTransferOpen(false);
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adjustMutation = useMutation({
    mutationFn: ({
      id,
      allocations,
    }: {
      id: string;
      allocations: Array<{ serviceId: string; remaining: number }>;
    }) => adjustClientPackageQuantities(id, allocations),
    onSuccess: async () => {
      toast.success("Quantities updated");
      setAdjustMode(false);
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expirationMutation = useMutation({
    mutationFn: ({
      id,
      expirationDate,
    }: {
      id: string;
      expirationDate: string | null;
    }) => updateClientPackageExpiration(id, expirationDate),
    onSuccess: async () => {
      toast.success("Expiration updated");
      setExpirationEditMode(false);
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detail = detailQuery.data;

  function startAdjust() {
    if (!detail) return;
    const draft: Record<string, number> = {};
    for (const allocation of detail.serviceAllocations) {
      draft[allocation.serviceId] = allocation.remaining;
    }
    setAllocationDraft(draft);
    setAdjustMode(true);
  }

  const columns = useMemo(
    () => [
      {
        id: "client",
        header: "Client",
        cell: (row: ClientPackageListItem) => (
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
        id: "name",
        header: "Name",
        cell: (row: ClientPackageListItem) => (
          <span className="inline-flex items-center gap-2">
            {packageDisplayName(row)}
            {row.isDemo ? <Badge variant="secondary">Demo</Badge> : null}
          </span>
        ),
      },
      {
        id: "qty",
        header: "Qty",
        className: "text-right",
        cell: (row: ClientPackageListItem) => (
          <span className="tabular-nums">{row.totalQty}</span>
        ),
      },
      {
        id: "purchaseDate",
        header: "Purchase date",
        cell: (row: ClientPackageListItem) => (
          <span className="text-muted-foreground">
            {formatListDate(row.purchaseDate)}
          </span>
        ),
      },
    ],
    [router],
  );

  const detailPanelProps = {
    selectedId,
    detail,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    onRetry: () => void detailQuery.refetch(),
    onDelete: () => {
      if (!detail) return;
      deleteMutation.mutate(detail.id);
    },
    onTransfer: () => setTransferOpen(true),
    onStartAdjust: startAdjust,
    adjustMode,
    allocationDraft,
    onAllocationChange: (serviceId: string, remaining: number) => {
      setAllocationDraft((prev) => ({ ...prev, [serviceId]: remaining }));
    },
    onCancelAdjust: () => setAdjustMode(false),
    onSaveAdjust: () => {
      if (!detail) return;
      adjustMutation.mutate({
        id: detail.id,
        allocations: detail.serviceAllocations.map((allocation) => ({
          serviceId: allocation.serviceId,
          remaining:
            allocationDraft[allocation.serviceId] ?? allocation.remaining,
        })),
      });
    },
    adjustPending: adjustMutation.isPending,
    onEditExpiration: () => {
      if (!detail) return;
      setExpirationDraft(
        detail.expirationDate ? detail.expirationDate.slice(0, 10) : "",
      );
      setExpirationEditMode(true);
    },
    expirationEditMode,
    expirationDraft,
    onExpirationDraftChange: setExpirationDraft,
    onCancelExpirationEdit: () => setExpirationEditMode(false),
    onSaveExpiration: () => {
      if (!detail) return;
      expirationMutation.mutate({
        id: detail.id,
        expirationDate: expirationDraft.trim() ? expirationDraft.trim() : null,
      });
    },
    expirationSavePending: expirationMutation.isPending,
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
          <PackagesMobileList
            packages={packages}
            isLoading={listQuery.isLoading}
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            selectedId={selectedId}
            onSelect={(row) => setSelectedId(row.id)}
            onCreate={canManage ? () => setAddOpen(true) : undefined}
            canCreate={canManage}
            pagination={
              listQuery.data?.meta && packages.length > 0
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
        title="Packages"
        description="Assign prepaid service packages to clients."
        search={
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search by name or client…"
            className="min-w-0 flex-1 sm:max-w-md"
          />
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/business/packages/setup")}
            >
              <LayoutTemplate className="mr-1.5 size-4" />
              Package setup
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/business/packages/settings")}
            >
              <Settings className="mr-1.5 size-4" />
              Settings
            </Button>
            {canManage ? (
              <ListPrimaryAction
                label="New Package"
                onClick={() => setAddOpen(true)}
              />
            ) : null}
          </>
        }
        footer={
          listQuery.data?.meta && packages.length > 0 ? (
            <ListPagination
              meta={listQuery.data.meta}
              page={page}
              onPageChange={setPage}
              label="packages"
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
            data={packages}
            getRowId={(row) => row.id}
            isLoading={listQuery.isLoading}
            density="compact"
            activeRowId={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
            getRowClassName={(row) =>
              selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
            }
            emptyTitle="No client packages yet"
            emptyDescription="Add a package to assign prepaid services to a client."
            emptyAction={
              canManage ? (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  Add package
                </Button>
              ) : undefined
            }
            className={WORKSPACE_TABLE_CLASS}
          />
        )}
      </EntityWorkspaceLayout>
      )}

      <EntityDetailDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            clearSelection();
            setExpirationEditMode(false);
          }
        }}
        width="standard"
        title={detail ? packageDisplayName(detail) : "Package"}
        subtitle={detail?.contact.name}
        isLoading={detailQuery.isLoading}
        badges={
          detail?.isDemo ? <Badge variant="secondary">Demo</Badge> : null
        }
        overflowActions={
          canManage && detail
            ? [
                {
                  id: "transfer",
                  label: "Transfer",
                  onSelect: detailPanelProps.onTransfer,
                },
                {
                  id: "adjust",
                  label: "Adjust quantities",
                  onSelect: detailPanelProps.onStartAdjust,
                },
                {
                  id: "delete",
                  label: "Delete",
                  destructive: true,
                  onSelect: detailPanelProps.onDelete,
                },
              ]
            : undefined
        }
      >
        {selectedId && detail ? (
          <PackageDetailPanel {...detailPanelProps} embedded />
        ) : null}
      </EntityDetailDrawer>

      {canManage ? (
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add package</DialogTitle>
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
              <Label>Package template</Label>
              <SearchableSelect
                items={templateOptions}
                value={templateId}
                onValueChange={setTemplateId}
                placeholder="Select package"
                inDialog
              />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase date</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="demo"
                checked={isDemo}
                onCheckedChange={(v) => setIsDemo(v === true)}
              />
              <Label htmlFor="demo">Mark as demo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!contactId || !templateId || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  contactId: contactId!,
                  packageTemplateId: templateId!,
                  purchaseDate,
                  isDemo,
                })
              }
            >
              Add package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      ) : null}

      {canManage ? (
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer package</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Transfer to</Label>
            <SearchableSelect
              items={contactOptions}
              value={transferContactId}
              onValueChange={setTransferContactId}
              placeholder="Search for client"
              inDialog
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!transferContactId || !selectedId}
              onClick={() =>
                transferMutation.mutate({
                  id: selectedId!,
                  targetContactId: transferContactId!,
                })
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      ) : null}
    </>
  );
}
