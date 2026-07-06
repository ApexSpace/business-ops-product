"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
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
  Sheet,
  SheetBody,
  SheetContent,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/hooks/use-mobile";
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
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { data: business } = useCurrentBusiness();

  const selectedId = searchParams.get("selected");
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

  const setSelectedId = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("selected", id);
    } else {
      params.delete("selected");
    }
    const qs = params.toString();
    router.replace(qs ? `/business/gift-cards?${qs}` : "/business/gift-cards", {
      scroll: false,
    });
  };

  const listQuery = useQuery({
    queryKey: queryKeys.giftCards.list({ search: search.trim() || undefined }),
    queryFn: () =>
      listGiftCards({ search: search.trim() || undefined, limit: 100 }),
  });

  const cards = listQuery.data?.items ?? [];
  const total = listQuery.data?.meta?.total ?? cards.length;

  useEffect(() => {
    if (!selectedId && cards.length > 0 && !isMobile) {
      setSelectedId(cards[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-select on first load
  }, [cards, selectedId, isMobile]);

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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-[var(--page-padding-x)] pb-[var(--page-padding-y)] pt-[var(--page-content-top-gap)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:grid-rows-1">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-xs">
          <ListToolbar
            className="rounded-none border-0 border-b bg-transparent p-3 shadow-none sm:px-4"
            search={
              <Input
                placeholder="Search by number or client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
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
          />

          {listQuery.isError ? (
            <ApiErrorState
              error={listQuery.error}
              onRetry={() => void listQuery.refetch()}
            />
          ) : listQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">
              Loading gift cards…
            </p>
          ) : cards.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={
                  <Gift className="size-5 text-muted-foreground/70" aria-hidden />
                }
                title="No gift cards yet"
                description="Create a gift card to get started."
                action={
                  <Button size="sm" onClick={() => void openAdd()}>
                    <Plus className="mr-1.5 size-4" />
                    Add gift card
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DataTable
                  columns={columns}
                  data={cards}
                  getRowId={(card) => card.id}
                  activeRowId={selectedId}
                  onRowClick={(card) => setSelectedId(card.id)}
                  getRowClassName={(card) =>
                    selectedId === card.id
                      ? "shadow-[inset_3px_0_0_0_var(--color-primary)]"
                      : undefined
                  }
                  className="rounded-none border-0 shadow-none"
                />
              </div>
              <div className="shrink-0 border-t border-border px-4 py-3 text-sm text-muted-foreground">
                {cards.length} of {total} gift cards
              </div>
            </div>
          )}
        </section>

        {!isMobile ? (
          <GiftCardDetailPanel
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
              <GiftCardDetailPanel
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
    </div>
  );
}
