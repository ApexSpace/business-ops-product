"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Settings  } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityDetailFooter } from "@/components/layout/entity-detail-footer";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
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
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { WORKSPACE_ACTIVE_ROW_CLASS } from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { queryKeys } from "@/lib/query/keys";
import { invalidateGiftCards } from "@/lib/query/invalidation";
import { listContacts } from "@/features/contacts/api/contacts.api";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import {
  createGiftCardManual,
  getGiftCard,
  getGiftCardOnlineSalesShare,
  getGiftCardSettings,
  listGiftCards,
  previewGiftCardNumber,
  sendDigitalGiftCard,
  updateGiftCard,
  voidGiftCard,
} from "@/features/gift-cards/api/gift-cards.api";
import { GiftCardDetailPanel } from "@/features/gift-cards/components/gift-card-detail-panel";
import { GiftCardsMobileList } from "@/features/gift-cards/components/mobile/gift-cards-mobile-list";
import {
  GiftCardMiniIcon,
  GiftCardStatusBadge,
} from "@/features/gift-cards/components/gift-card-visual";
import { useGiftCardStaffPermissions } from "@/features/gift-cards/hooks/use-gift-card-staff-permissions";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import type { GiftCardListItem } from "@/features/gift-cards/types";

const PAGE_LIMIT = 25;

export function GiftCardsWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: business } = useCurrentBusiness();
  const { canManage } = useGiftCardStaffPermissions();
  const isMobile = useIsMobile();
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection({ legacyIdParams: ["selected"] });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");
  const [notesDraft, setNotesDraft] = useState("");

  const [newNumber, setNewNumber] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [ownerContactId, setOwnerContactId] = useState<string | null>(null);
  const [purchasingContactId, setPurchasingContactId] = useState<string | null>(
    null,
  );
  const [newNotes, setNewNotes] = useState("");

  const listQuery = useQuery({
    queryKey: queryKeys.giftCards.list({
      search: search.trim() || undefined,
      page,
      limit: PAGE_LIMIT,
    }),
    queryFn: () =>
      listGiftCards({
        search: search.trim() || undefined,
        page,
        limit: PAGE_LIMIT,
      }),
  });

  const cards = listQuery.data?.items ?? [];

  const detailQuery = useQuery({
    queryKey: queryKeys.giftCards.detail(selectedId ?? ""),
    queryFn: () => getGiftCard(selectedId!),
    enabled: !!selectedId,
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.giftCards.settings(),
    queryFn: getGiftCardSettings,
  });

  const contactsQuery = useQuery({
    queryKey: queryKeys.contacts.list({ limit: 100 }),
    queryFn: () => listContacts({ limit: 100 }),
  });

  const contactOptions = useMemo(
    () =>
      (contactsQuery.data?.items ?? []).map((c) => ({
        value: c.id,
        label:
          c.displayName ||
          [c.firstName, c.lastName].filter(Boolean).join(" ") ||
          c.email ||
          c.id,
      })),
    [contactsQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: createGiftCardManual,
    onSuccess: async (card) => {
      toast.success("Gift card created");
      setAddOpen(false);
      await invalidateGiftCards(queryClient);
      setSelectedId(card.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, notes,
}: { id: string; notes: string }) =>
      updateGiftCard(id, { notes }),
    onSuccess: async () => {
      toast.success("Gift card updated");
      setDrawerMode("view");
      await invalidateGiftCards(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const voidMutation = useMutation({
    mutationFn: voidGiftCard,
    onSuccess: async () => {
      toast.success("Gift card voided");
      await invalidateGiftCards(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendMutation = useMutation({
    mutationFn: sendDigitalGiftCard,
    onSuccess: () => toast.success("Digital gift card sent"),
    onError: (err: Error) => toast.error(err.message),
  });

  const openAdd = async () => {
    setAddOpen(true);
    setNewAmount("");
    setOwnerContactId(null);
    setPurchasingContactId(null);
    setNewNotes("");
    if (settingsQuery.data?.autoGenerateNumber) {
      const preview = await previewGiftCardNumber();
      setNewNumber(preview.number ?? "");
    } else {
      setNewNumber("");
    }
  };

  const prefetchSettings = () => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.giftCards.settings(),
      queryFn: getGiftCardSettings,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.giftCards.onlineSalesShare(),
      queryFn: getGiftCardOnlineSalesShare,
    });
  };

  const columns = useMemo(
    () => [
      {
        id: "giftCard",
        header: "Gift card",
        cell: (card: GiftCardListItem) => (
          <div className="flex items-center gap-2.5">
            <GiftCardMiniIcon />
            <span className="font-medium tabular-nums">{card.number}</span>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (card: GiftCardListItem) => (
          <GiftCardStatusBadge status={card.status} />
        ),
      },
      {
        id: "balance",
        header: "Balance",
        className: "text-right",
        cell: (card: GiftCardListItem) => {
          const zero = Number(card.currentBalance) === 0;
          return (
            <span
              className={cn(
                "tabular-nums font-semibold",
                zero && "font-normal text-muted-foreground",
              )}
            >
              {formatMoney(card.currentBalance)}
            </span>
          );
        },
      },
      {
        id: "purchasedBy",
        header: "Purchased by",
        cell: (card: GiftCardListItem) =>
          card.purchasingContact ? (
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/business/contacts?contact=${card.purchasingContact!.id}`,
                );
              }}
            >
              {card.purchasingContact.name}
            </button>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "owner",
        header: "Owner",
        cell: (card: GiftCardListItem) => (
          <span className="text-muted-foreground">{card.ownerContact.name}</span>
        ),
      },
    ],
    [router],
  );

  const detail = detailQuery.data;

  const detailPanelProps = {
    selectedId,
    detail,
    businessName: business?.name,
    fallbackArtworkUrl: settingsQuery.data?.artworkUrl,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    onRetry: () => void detailQuery.refetch(),
    onEditNotes: () => {
      if (!detail) return;
      setNotesDraft(detail.notes ?? "");
      setDrawerMode("edit");
    },
    onSend: () => {
      if (!selectedId) return;
      sendMutation.mutate(selectedId);
    },
    sendPending: sendMutation.isPending,
    onVoid: () => {
      if (!selectedId) return;
      voidMutation.mutate(selectedId);
    },
    voidPending: voidMutation.isPending,
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
          <GiftCardsMobileList
            cards={cards}
            isLoading={listQuery.isLoading}
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            selectedId={selectedId}
            onSelect={(card) => {
              setDrawerMode("view");
              setSelectedId(card.id);
            }}
            onCreate={canManage ? () => void openAdd() : undefined}
            canCreate={canManage}
            pagination={
              listQuery.data?.meta && cards.length > 0
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
      <EntityListLayout
        title="Gift cards"
        description="Issue, track, and redeem gift cards."
        addButtonLabel="New Gift Card"
        onAdd={canManage ? () => void openAdd() : undefined}
        extraActions={
          canManage ? (
            <Button
              variant="outline"
              onMouseEnter={prefetchSettings}
              onFocus={prefetchSettings}
              onClick={() => router.push("/business/gift-cards/settings")}
            >
              <Settings className="mr-1.5 size-4" />
              Settings
            </Button>
          ) : null
        }
        searchPlaceholder="Search by number or client…"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        footer={
          listQuery.data?.meta && cards.length > 0 ? (
            <ListPagination
              meta={listQuery.data.meta}
              page={page}
              onPageChange={setPage}
              label="gift cards"
              compact
            />
          ) : undefined
        }
        error={
          listQuery.isError ? (
            <ApiErrorState
              error={listQuery.error}
              onRetry={() => void listQuery.refetch()}
            />
          ) : undefined
        }
        columns={columns}
        data={cards}
        getRowId={(row) => row.id}
        isLoading={listQuery.isLoading}
        density="compact"
        activeRowId={selectedId}
        onRowClick={(card) => {
          setDrawerMode("view");
          setSelectedId(card.id);
        }}
        getRowClassName={(row) =>
          selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
        }
        emptyTitle="No gift cards yet"
        emptyDescription="Issue a gift card to get started."
        emptyAction={
          canManage ? (
            <ListPrimaryAction
              label="New Gift Card"
              onClick={() => void openAdd()}
            />
          ) : undefined
        }
      />
      )}

      <EntityDetailDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            clearSelection();
            setDrawerMode("view");
          }
        }}
        width="standard"
        title={
          drawerMode === "edit"
            ? "Edit gift card"
            : detail
              ? `#${detail.number}`
              : "Gift card"
        }
        subtitle={drawerMode === "edit" ? undefined : detail?.ownerContact.name}
        isLoading={detailQuery.isLoading}
        badges={
          drawerMode === "view" && detail ? (
            <GiftCardStatusBadge status={detail.status} />
          ) : null
        }
        headerActions={
          canManage && detail ? (
            drawerMode === "view" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={detailPanelProps.onEditNotes}
              >
                <Pencil className="mr-1 size-3.5" />
                Edit
              </Button>
            ) : null
          ) : null
        }
        footer={
          canManage && detail ? (
            drawerMode === "edit" ? (
              <EntityDetailFooter>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto sm:min-w-[10rem]"
                  disabled={updateMutation.isPending}
                  onClick={() => setDrawerMode("view")}
                >
                  Cancel
                </Button>
                <Button
                  variant="brand"
                  className="w-full sm:w-auto sm:min-w-[10rem]"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({ id: detail.id, notes: notesDraft })
                  }
                >
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </EntityDetailFooter>
            ) : (
              <EntityDetailFooter className="flex-col sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={detail.status !== "ACTIVE" || sendMutation.isPending}
                  onClick={detailPanelProps.onSend}
                >
                  Send digital gift card
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={detail.status === "VOIDED" || voidMutation.isPending}
                  onClick={detailPanelProps.onVoid}
                >
                  Void gift card
                </Button>
              </EntityDetailFooter>
            )
          ) : null
        }
      >
        {selectedId && detail ? (
          <GiftCardDetailPanel
            {...detailPanelProps}
            embedded
            editing={drawerMode === "edit"}
            notesDraft={notesDraft}
            onNotesDraftChange={setNotesDraft}
          />
        ) : null}
      </EntityDetailDrawer>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Gift Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Number</Label>
              <Input
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="Enter or scan gift card number"
                readOnly={settingsQuery.data?.autoGenerateNumber}
              />
              {settingsQuery.data?.autoGenerateNumber ? (
                <p className="text-xs text-muted-foreground">Auto-generated</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                selectOnFocus
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner client</Label>
              <SearchableSelect
                inDialog
                items={contactOptions}
                value={ownerContactId}
                onValueChange={setOwnerContactId}
                placeholder="Search or create client"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Purchasing client (optional)</Label>
              <SearchableSelect
                inDialog
                items={contactOptions}
                value={purchasingContactId}
                onValueChange={setPurchasingContactId}
                placeholder="Who paid for this card"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!ownerContactId || !newAmount || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  number: newNumber || undefined,
                  initialValue: Number(newAmount),
                  ownerContactId: ownerContactId!,
                  purchasingContactId: purchasingContactId ?? undefined,
                  notes: newNotes || undefined,
                })
              }
            >
              Create Gift Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
