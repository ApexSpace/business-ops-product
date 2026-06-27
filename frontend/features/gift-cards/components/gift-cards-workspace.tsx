"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Plus, Search, Settings } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { cn } from "@/lib/utils";
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
import type { GiftCardListItem } from "@/features/gift-cards/types";

function statusBadge(status: GiftCardListItem["status"]) {
  if (status === "VOIDED") return <Badge variant="destructive">Voided</Badge>;
  if (status === "DEPLETED") return <Badge variant="secondary">Depleted</Badge>;
  return null;
}

function transactionLabel(type: string) {
  switch (type) {
    case "INITIAL_VALUE":
      return "Initial value";
    case "REDEMPTION":
      return "Redemption";
    case "REFUND":
      return "Refund";
    case "ADJUSTMENT":
      return "Adjustment";
    case "VOID":
      return "Voided";
    default:
      return type;
  }
}

export function GiftCardsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("selected");
  const queryClient = useQueryClient();

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
    queryFn: () => listGiftCards({ search: search.trim() || undefined, limit: 100 }),
  });

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
        label: c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || c.id,
      })),
    [contactsQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: createGiftCardManual,
    onSuccess: async (card) => {
      toast.success("Gift card created");
      setAddOpen(false);
      await invalidateGiftCards(queryClient);
      router.push(`/business/gift-cards?selected=${card.id}`);
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

  const cards = listQuery.data?.items ?? [];
  const detail = detailQuery.data;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] w-full overflow-hidden rounded-lg border bg-card">
      <div className="flex min-w-0 flex-1 flex-col border-r">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Button onClick={() => void openAdd()}>
            <Plus className="mr-2 size-4" />
            Add Gift Card
          </Button>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by number or client"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/business/gift-cards/settings")}
          >
            <Settings className="mr-2 size-4" />
            Settings
          </Button>
        </div>

        {listQuery.isError ? (
          <ApiErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Number</th>
                  <th className="px-3 py-2 font-medium">Balance</th>
                  <th className="px-3 py-2 font-medium">Purchasing Client</th>
                  <th className="px-3 py-2 font-medium">Owner Client</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr
                    key={card.id}
                    className={cn(
                      "cursor-pointer border-t hover:bg-muted/30",
                      selectedId === card.id && "bg-muted/40",
                    )}
                    onClick={() =>
                      router.push(`/business/gift-cards?selected=${card.id}`)
                    }
                  >
                    <td className="px-3 py-2 font-medium">
                      {card.number}
                      <span className="ml-2">{statusBadge(card.status)}</span>
                    </td>
                    <td className="px-3 py-2">{formatMoney(card.currentBalance)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {card.purchasingContact?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2">{card.ownerContact.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!listQuery.isLoading && cards.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No gift cards yet.
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="w-[360px] shrink-0 overflow-auto p-4">
        {!selectedId || !detail ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <Gift className="mb-3 size-10 opacity-40" />
            <p>Select a gift card to view details</p>
          </div>
        ) : detailQuery.isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : detailQuery.isError ? (
          <ApiErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Gift Card</h2>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditNotes(true);
                    setNotesDraft(detail.notes ?? "");
                  }}
                >
                  Edit
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Number</p>
              <p className="font-medium">{detail.number}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-lg font-semibold">
                {formatMoney(detail.currentBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Owned by</p>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() =>
                  router.push(`/business/contacts/${detail.ownerContact.id}`)
                }
              >
                {detail.ownerContact.name}
              </button>
            </div>
            {detail.notes ? (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm">{detail.notes}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium">History</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="py-1 text-left">Date</th>
                    <th className="py-1 text-left">Type</th>
                    <th className="py-1 text-right">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.transactions.map((tx) => {
                    const amount = Number(tx.amount);
                    return (
                      <tr key={tx.id} className="border-t">
                        <td className="py-1">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-1">{transactionLabel(tx.type)}</td>
                        <td className="py-1 text-right">
                          {amount >= 0 ? "+" : ""}
                          {formatMoney(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={detail.status !== "ACTIVE"}
                onClick={() => sendMutation.mutate(detail.id)}
              >
                Send Digital Gift Card
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={detail.status === "VOIDED"}
                onClick={() => voidMutation.mutate(detail.id)}
              >
                Void Gift Card
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Created on{" "}
              {new Date(detail.createdAt).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}
      </aside>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Gift Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Number</Label>
              <Input
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="Enter or scan gift card number"
                readOnly={settingsQuery.data?.autoGenerateNumber}
              />
              {settingsQuery.data?.autoGenerateNumber ? (
                <p className="mt-1 text-xs text-muted-foreground">Auto-generated</p>
              ) : null}
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Owner client</Label>
              <SearchableSelect
                inDialog
                items={contactOptions}
                value={ownerContactId}
                onValueChange={setOwnerContactId}
                placeholder="Search or create client"
              />
            </div>
            <div>
              <Label>Purchasing client (optional)</Label>
              <SearchableSelect
                inDialog
                items={contactOptions}
                value={purchasingContactId}
                onValueChange={setPurchasingContactId}
                placeholder="Who paid for this card"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
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
          <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNotes(false)}>
              Cancel
            </Button>
            <Button
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
