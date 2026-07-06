"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, LayoutTemplate, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { DataTable } from "@/components/data-display/data-table";
import { EmptyState } from "@/components/data-display/empty-state";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { ListToolbar } from "@/components/layout/list-toolbar";
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
  Sheet,
  SheetBody,
  SheetContent,
} from "@/components/ui/sheet";
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
import type { ClientPackageListItem } from "@/features/packages/types";

function formatListDate(value: string) {
  return DateTime.fromISO(value).toFormat("MMMM d");
}

export function PackagesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const selectedId = searchParams.get("selected");
  const contactFilter = searchParams.get("contact");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState(false);
  const [allocationDraft, setAllocationDraft] = useState<
    Record<string, number>
  >({});

  const [contactId, setContactId] = useState<string | null>(contactFilter);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [isDemo, setIsDemo] = useState(false);
  const [transferContactId, setTransferContactId] = useState<string | null>(
    null,
  );
  const [expirationDraft, setExpirationDraft] = useState("");

  const setSelectedId = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("selected", id);
    } else {
      params.delete("selected");
    }
    const qs = params.toString();
    router.replace(qs ? `/business/packages?${qs}` : "/business/packages", {
      scroll: false,
    });
  };

  useEffect(() => {
    if (contactFilter) {
      setContactId(contactFilter);
      setAddOpen(true);
    }
  }, [contactFilter]);

  const listQuery = useQuery({
    queryKey: queryKeys.packages.clientList({ search }),
    queryFn: () => listClientPackages({ search: search || undefined }),
  });

  const packages = listQuery.data ?? [];

  useEffect(() => {
    if (!selectedId && packages.length > 0 && !isMobile) {
      setSelectedId(packages[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-select on first load
  }, [packages, selectedId, isMobile]);

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
      setSelectedId(null);
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
      const next = prompt(
        "Expiration date (YYYY-MM-DD) or leave empty for none:",
        expirationDraft,
      );
      if (next === null) return;
      expirationMutation.mutate({
        id: detail.id,
        expirationDate: next.trim() ? next.trim() : null,
      });
    },
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
                placeholder="Search by name or client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 sm:max-w-md"
              />
            }
            actions={
              <>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="sm:hidden"
                  aria-label="Package setup"
                  onClick={() => router.push("/business/packages/setup")}
                >
                  <LayoutTemplate className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden shrink-0 sm:inline-flex"
                  onClick={() => router.push("/business/packages/setup")}
                >
                  <LayoutTemplate className="mr-1.5 size-4" />
                  Package setup
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="sm:hidden"
                  aria-label="Settings"
                  onClick={() => router.push("/business/packages/settings")}
                >
                  <Settings className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden shrink-0 sm:inline-flex"
                  onClick={() => router.push("/business/packages/settings")}
                >
                  <Settings className="mr-1.5 size-4" />
                  Settings
                </Button>
                <Button
                  size="icon-sm"
                  className="sm:hidden"
                  aria-label="Add package"
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
                  Add package
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
              Loading packages…
            </p>
          ) : packages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={
                  <Boxes className="size-5 text-muted-foreground/70" aria-hidden />
                }
                title="No client packages yet"
                description="Add a package to assign prepaid services to a client."
                action={
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="mr-1.5 size-4" />
                    Add package
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DataTable
                  columns={columns}
                  data={packages}
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
                {packages.length} package{packages.length === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </section>

        {!isMobile ? (
          <PackageDetailPanel
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
              <PackageDetailPanel
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
    </div>
  );
}
