"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
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
  adjustContactWallet,
  getContactWallet,
} from "@/features/contacts/api/contact-workspace.api";
import { ContactRecordsSectionPlaceholder } from "@/features/contacts/workspace/records/contact-records-placeholder";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import { invalidateContactWorkspace } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

export function ContactRecordsWalletSection({ contact, businessTimezone }: ContactRecordsSectionProps) {
  const queryClient = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [adjustType, setAdjustType] = useState<"MANUAL_CREDIT" | "MANUAL_DEBIT">(
    "MANUAL_CREDIT",
  );

  const { data: wallet, isLoading } = useQuery({
    queryKey: queryKeys.contacts.wallet(contact.id),
    queryFn: () => getContactWallet(contact.id),
  });

  const adjustMutation = useMutation({
    mutationFn: () =>
      adjustContactWallet(contact.id, {
        amount: Number(amount),
        type: adjustType,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Wallet updated");
      void invalidateContactWorkspace(queryClient, contact.id);
      setAdjustOpen(false);
      setAmount("");
      setDescription("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <RecordListEmpty message="Loading wallet…" />;

  const balance = wallet?.balance.amount ?? "0.00";
  const currency = wallet?.balance.currency ?? "USD";

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border/70 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Current balance</p>
            <p className="mt-1 text-2xl font-semibold">
              {currency} {balance}
            </p>
          </div>
          <ActionButton size="sm" onClick={() => setAdjustOpen(true)}>
            <Plus className="mr-1 size-3.5" />
            Add to balance
          </ActionButton>
        </div>
      </div>

      <ContactRecordsSectionPlaceholder
        title="Credit cards"
        description="Saved payment methods coming soon. Cards on file will appear here when Stripe card storage is enabled."
      />

      <ContactRecordsSectionPlaceholder
        title="Gift cards"
        description="Gift card balances coming soon. Purchased and redeemed gift cards will appear here."
      />

      <div>
        <h4 className="mb-2 text-sm font-semibold">Recent transactions</h4>
        {!wallet?.transactions.length ? (
          <EmptyState compact title="No transactions yet" className="py-6" />
        ) : (
          <ul className="space-y-2">
            {wallet.transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {tx.amount.startsWith("-") ? tx.amount : `+${tx.amount}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.description || tx.type.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatContactCreatedAt(tx.createdAt, businessTimezone)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust account balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={adjustType === "MANUAL_CREDIT" ? "default" : "outline"}
                onClick={() => setAdjustType("MANUAL_CREDIT")}
              >
                Credit
              </Button>
              <Button
                type="button"
                size="sm"
                variant={adjustType === "MANUAL_DEBIT" ? "default" : "outline"}
                onClick={() => setAdjustType("MANUAL_DEBIT")}
              >
                Debit
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-amount">Amount</Label>
              <Input
                id="wallet-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-description">Description (optional)</Label>
              <Input
                id="wallet-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => adjustMutation.mutate()}
              disabled={!amount || adjustMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
