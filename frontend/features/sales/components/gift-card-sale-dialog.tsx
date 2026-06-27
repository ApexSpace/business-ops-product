"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { listContacts } from "@/features/contacts/api/contacts.api";
import {
  getGiftCardSettings,
  previewGiftCardNumber,
} from "@/features/gift-cards/api/gift-cards.api";
import { queryKeys } from "@/lib/query/keys";

export interface GiftCardSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOwnerContactId?: string | null;
  onSubmit: (values: {
    number?: string;
    amount: number;
    ownerContactId: string;
    sendDigital: boolean;
  }) => void;
  isPending?: boolean;
}

export function GiftCardSaleDialog({
  open,
  onOpenChange,
  defaultOwnerContactId,
  onSubmit,
  isPending,
}: GiftCardSaleDialogProps) {
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [ownerContactId, setOwnerContactId] = useState<string | null>(
    defaultOwnerContactId ?? null,
  );
  const [sendDigital, setSendDigital] = useState(false);

  const settingsQuery = useQuery({
    queryKey: queryKeys.giftCards.settings(),
    queryFn: getGiftCardSettings,
    enabled: open,
  });

  const contactsQuery = useQuery({
    queryKey: queryKeys.contacts.list({ limit: 100 }),
    queryFn: () => listContacts({ limit: 100 }),
    enabled: open,
  });

  const contactOptions =
    contactsQuery.data?.items.map((c) => ({
      value: c.id,
      label:
        c.displayName ||
        [c.firstName, c.lastName].filter(Boolean).join(" ") ||
        c.email ||
        c.id,
    })) ?? [];

  useEffect(() => {
    if (!open) return;
    setOwnerContactId(defaultOwnerContactId ?? null);
    setAmount("");
    setSendDigital(false);
    void (async () => {
      if (settingsQuery.data?.autoGenerateNumber) {
        const preview = await previewGiftCardNumber();
        setNumber(preview.number ?? "");
      } else {
        setNumber("");
      }
    })();
  }, [open, defaultOwnerContactId, settingsQuery.data?.autoGenerateNumber]);

  const autoGenerate = settingsQuery.data?.autoGenerateNumber ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add gift card to sale</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Gift card number</Label>
            <div className="relative">
              {!autoGenerate ? (
                <ScanLine className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              ) : null}
              <Input
                className={autoGenerate ? undefined : "pl-8"}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Enter or scan gift card number"
                readOnly={autoGenerate}
              />
            </div>
            {autoGenerate ? (
              <p className="text-xs text-muted-foreground">Auto-generated</p>
            ) : (
              <p className="text-xs text-muted-foreground">Or scan barcode</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Owner client</Label>
            <SearchableSelect
              inDialog
              items={contactOptions}
              value={ownerContactId}
              onValueChange={setOwnerContactId}
              placeholder="Who will receive this gift card"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="send-digital"
              checked={sendDigital}
              onCheckedChange={(checked) => setSendDigital(checked === true)}
            />
            <Label htmlFor="send-digital" className="font-normal">
              Email this gift card to the owner after checkout
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              !ownerContactId ||
              !amount ||
              parseFloat(amount) <= 0 ||
              (!autoGenerate && !number.trim()) ||
              isPending
            }
            onClick={() =>
              onSubmit({
                number: number.trim() || undefined,
                amount: parseFloat(amount),
                ownerContactId: ownerContactId!,
                sendDigital,
              })
            }
          >
            Add to checkout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
