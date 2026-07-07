"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { DataTable } from "@/components/data-display/data-table";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { SearchInput } from "@/components/forms/search-input";
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
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { queryKeys } from "@/lib/query/keys";
import { invalidateGiftCards } from "@/lib/query/invalidation";
import { listContacts } from "@/features/contacts/api/contacts.api";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import {
  createGiftCardManual,
  getGiftCard,
  getGiftCardSettings,
  listGiftCards,
  previewGiftCardNumber,
  sendDigitalGiftCard,
  updateGiftCard,
  voidGiftCard,
} from "@/features/gift-cards/api/gift-cards.api";
import { GiftCardDetailPanel } from "@/features/gift-cards/components/gift-card-detail-panel";
import {
  GiftCardMiniIcon,
  GiftCardStatusBadge,
} from "@/features/gift-cards/components/gift-card-visual";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import type { GiftCardListItem } from "@/features/gift-cards/types";

export function GiftCardsWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: business } = useCurrentBusiness();
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection({ legacyIdParams: ["selected"] });

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const [newNumber, setNewNumber] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [ownerContactId, setOwnerContactId] = useState<string | null>(null);
  const [purchasingContactId, setPurchasingContactId] = useState<string | null>(
    null,
  );
  const [newNotes, setNewNotes] = useState("");

  const listQuery = useQuery({
    queryKey: queryKeys.giftCards.list({ search: search.trim() || undefined }),
    queryFn: () =>
      listGiftCards({ search: search.trim() || undefined, limit: 100 }),
  });

  const cards = listQuery.data?.items ?? [];
  const total = listQuery.data?.meta?.total ?? cards.length;

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
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      updateGiftCard(id, { notes }),
    onSuccess: async () => {
      toast.success("Gift card updated");
      setEditNotes(false);
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
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    onRetry: () => void detailQuery.refetch(),
    onEditNotes: () => {
      if (!detail) return;
      setEditNotes(true);
      setNotesDraft(detail.notes ?? "");
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
      <EntityWorkspaceLayout
        title="Gift cards"
        description="Issue, track, and redeem gift cards."
        search={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by number or client…"
            className="min-w-0 flex-1 sm:max-w-md"
          />
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/business/gift-cards/settings")}
            >
              <Settings className="mr-1.5 size-4" />
              Settings
            </Button>
            <Button size="sm" onClick={() => void openAdd()}>
              <Plus className="mr-1.5 size-4" />
              Add gift card
            </Button>
          </>
        }
        footer={
          cards.length > 0
            ? `${cards.length} of ${total} gift cards`
            : undefined
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
            data={cards}
            getRowId={(card) => card.id}
            isLoading={listQuery.isLoading}
            density="compact"
            activeRowId={selectedId}
            onRowClick={(card) => setSelectedId(card.id)}
            getRowClassName={(card) =>
              selectedId === card.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
            }
            emptyTitle="No gift cards yet"
            emptyDescription="Create a gift card to get started."
            emptyAction={
              <Button size="sm" onClick={() => void openAdd()}>
                <Plus className="mr-1.5 size-4" />
                Add gift card
              </Button>
            }
            className={WORKSPACE_TABLE_CLASS}
          />
        )}
      </EntityWorkspaceLayout>

      <EntityDetailDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        title={detail ? `#${detail.number}` : "Gift card"}
        subtitle={detail?.ownerContact.name}
        isLoading={detailQuery.isLoading}
        badges={
          detail ? <GiftCardStatusBadge status={detail.status} /> : null
        }
        headerActions={
          detail ? (
            <Button variant="outline" size="sm" onClick={detailPanelProps.onEditNotes}>
              <Pencil className="mr-1 size-3.5" />
              Edit
            </Button>
          ) : null
        }
        footer={
          detail ? (
            <div className="flex w-full flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={detail.status !== "ACTIVE" || sendMutation.isPending}
                onClick={detailPanelProps.onSend}
              >
                Send digital gift card
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={detail.status === "VOIDED" || voidMutation.isPending}
                onClick={detailPanelProps.onVoid}
              >
                Void gift card
              </Button>
            </div>
          ) : null
        }
      >
        {selectedId && detail ? (
          <GiftCardDetailPanel
            {...detailPanelProps}
            embedded
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

      <Dialog open={editNotes} onOpenChange={setEditNotes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit gift card</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNotes(false)}>
              Cancel
            </Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() =>
                detail &&
                updateMutation.mutate({ id: detail.id, notes: notesDraft })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
