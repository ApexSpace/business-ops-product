"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { DataTable } from "@/components/data-display/data-table";
import { ListPagination } from "@/components/ui/list-pagination";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createOffer,
  deleteOffer,
  disableOffer,
  duplicateOffer,
  enableOffer,
  getOffer,
  listOffers,
} from "@/features/offers/api/offers.api";
import { OfferDetailPanel } from "@/features/offers/components/offer-detail-panel";
import { OffersMobileList } from "@/features/offers/components/mobile/offers-mobile-list";
import { useOfferListColumns } from "@/features/offers/components/offer-list-columns";
import { useOfferStaffPermissions } from "@/features/offers/hooks/use-offer-staff-permissions";
import {
  OFFER_DETAIL_TABS,
  offerDrawerSubtitle,
  type OfferTabId,
} from "@/features/offers/utils/offer-workspace-utils";
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
import { invalidateOffers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 25;

export function OffersScreen() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const {
    selectedId,
    tab,
    isOpen,
    setSelectedId,
    setTab,
    clearSelection,
  } = useEntitySelection({
    legacyIdParams: ["selected"],
    defaultTab: "details",
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { canManage } = useOfferStaffPermissions();

  const activeTab = (tab ?? "details") as OfferTabId;

  const listFilters = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      search: search.trim() || undefined,
    }),
    [page, search],
  );

  const offersQuery = useQuery({
    queryKey: queryKeys.offers.list(listFilters),
    queryFn: () => listOffers(listFilters),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.offers.detail(selectedId ?? ""),
    queryFn: () => getOffer(selectedId!),
    enabled: !!selectedId,
  });

  const offers = offersQuery.data?.items ?? [];
  const columns = useOfferListColumns();
  const detail = detailQuery.data;

  const invalidate = async () => invalidateOffers(queryClient);

  const createOfferMutation = useMutation({
    mutationFn: () =>
      createOffer({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      }),
    onSuccess: async (offer) => {
      toast.success("Offer created");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setSelectedId(offer.id);
      setTab("details");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      enabled ? enableOffer(id) : disableOffer(id),
    onSuccess: async (_, { enabled }) => {
      toast.success(enabled ? "Offer enabled" : "Offer disabled");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateOfferMutation = useMutation({
    mutationFn: duplicateOffer,
    onSuccess: async (offer) => {
      toast.success("Offer duplicated");
      setSelectedId(offer.id);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteOfferMutation = useMutation({
    mutationFn: deleteOffer,
    onSuccess: async () => {
      toast.success("Offer deleted");
      setDeleteOpen(false);
      clearSelection();
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      {isMobile ? (
        offersQuery.isError ? (
          <ApiErrorState
            error={offersQuery.error}
            onRetry={() => void offersQuery.refetch()}
          />
        ) : (
          <OffersMobileList
            offers={offers}
            isLoading={offersQuery.isLoading}
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            selectedId={selectedId}
            onSelect={(offer) => setSelectedId(offer.id)}
            onCreate={canManage ? () => setCreateOpen(true) : undefined}
            canCreate={canManage}
            pagination={
              offersQuery.data?.meta && offers.length > 0
                ? {
                    meta: offersQuery.data.meta,
                    page,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        )
      ) : (
      <EntityWorkspaceLayout
        title="Offers"
        description="Create and manage promotional offers and discounts."
        search={
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search offers…"
            className="min-w-0 flex-1 sm:max-w-md"
          />
        }
        actions={
          canManage ? (
            <>
              <Button
                size="icon-sm"
                className="sm:hidden"
                aria-label="Create offer"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
              <Button
                size="sm"
                className="hidden shrink-0 sm:inline-flex"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-1.5 size-4" />
                Create offer
              </Button>
            </>
          ) : null
        }
        footer={
          offersQuery.data?.meta && offers.length > 0 ? (
            <ListPagination
              meta={offersQuery.data.meta}
              page={page}
              onPageChange={setPage}
              label="offers"
              compact
            />
          ) : undefined
        }
      >
        {offersQuery.isError ? (
          <ApiErrorState
            error={offersQuery.error}
            onRetry={() => void offersQuery.refetch()}
          />
        ) : (
          <DataTable
            columns={columns}
            data={offers}
            getRowId={(offer) => offer.id}
            isLoading={offersQuery.isLoading}
            density="compact"
            activeRowId={selectedId}
            onRowClick={(offer) => setSelectedId(offer.id)}
            getRowClassName={(offer) =>
              selectedId === offer.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
            }
            emptyTitle="No offers yet"
            emptyDescription="Create your first promotional offer to get started."
            emptyAction={
              canManage ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-1.5 size-4" />
                  Create offer
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
          if (!open) clearSelection();
        }}
        title={detail?.name ?? "Offer"}
        subtitle={detail ? offerDrawerSubtitle(detail) : undefined}
        isLoading={detailQuery.isLoading}
        width="wide"
        badges={
          detail ? (
            <Badge variant={detail.isEnabled ? "success" : "neutral"}>
              {detail.isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          ) : null
        }
        headerActions={
          canManage && detail ? (
            <Button
              variant="outline"
              size="sm"
              disabled={toggleEnabled.isPending}
              className={cn(
                detail.isEnabled &&
                  "border-destructive/30 text-destructive hover:bg-destructive-subtle",
              )}
              onClick={() =>
                toggleEnabled.mutate({
                  id: detail.id,
                  enabled: !detail.isEnabled,
                })
              }
            >
              {detail.isEnabled ? "Disable" : "Enable"}
            </Button>
          ) : null
        }
        overflowActions={
          canManage && selectedId
            ? [
                {
                  id: "duplicate",
                  label: "Duplicate",
                  icon: <Copy className="mr-2 size-4" />,
                  onSelect: () => duplicateOfferMutation.mutate(selectedId),
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <Trash2 className="mr-2 size-4" />,
                  destructive: true,
                  onSelect: () => setDeleteOpen(true),
                },
              ]
            : undefined
        }
        tabs={OFFER_DETAIL_TABS}
        activeTab={activeTab}
        onTabChange={(value) => setTab(value)}
      >
        {selectedId && detail ? (
          <OfferDetailPanel
            offer={detail}
            activeTab={activeTab}
            canManage={canManage}
          />
        ) : null}
      </EntityDetailDrawer>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || createOfferMutation.isPending}
              onClick={() => createOfferMutation.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete offer?"
        description="This offer will be permanently removed. This action cannot be undone."
        isPending={deleteOfferMutation.isPending}
        onConfirm={() => selectedId && deleteOfferMutation.mutate(selectedId)}
      />
    </>
  );
}
