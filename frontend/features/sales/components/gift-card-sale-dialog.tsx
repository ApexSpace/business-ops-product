"use client";

import { DRAWER_PRIMARY_BUTTON_CLASS } from "@/lib/design/drawer-tokens";

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
  DialogDescription,
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
import {
  SALES_DIALOG_BODY_CLASS,
  SALES_DIALOG_CONTENT_CLASS,
  SALES_DIALOG_DESCRIPTION_CLASS,
  SALES_DIALOG_FIELD_CLASS,
  SALES_DIALOG_FOOTER_CLASS,
  SALES_DIALOG_HEADER_CLASS,
  SALES_DIALOG_LABEL_CLASS,
  SALES_DIALOG_SECONDARY_BUTTON_CLASS,
  SALES_DIALOG_TITLE_CLASS,
  SALES_DRAWER_FIELD_CLASS,
  SALES_DRAWER_SELECT_TRIGGER_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

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
      <DialogContent size="md" className={SALES_DIALOG_CONTENT_CLASS}>
        <DialogHeader className={SALES_DIALOG_HEADER_CLASS}>
          <DialogTitle className={SALES_DIALOG_TITLE_CLASS}>
            Add gift card
          </DialogTitle>
          <DialogDescription className={SALES_DIALOG_DESCRIPTION_CLASS}>
            Sell a gift card as a line on this checkout.
          </DialogDescription>
        </DialogHeader>

        <div className={SALES_DIALOG_BODY_CLASS}>
          <div className={SALES_DIALOG_FIELD_CLASS}>
            <Label htmlFor="gift-card-number" className={SALES_DIALOG_LABEL_CLASS}>
              Gift card number
            </Label>
            <div className="relative">
              {!autoGenerate ? (
                <ScanLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A8A8A]" />
              ) : null}
              <Input
                id="gift-card-number"
                className={cn(
                  SALES_DRAWER_FIELD_CLASS,
                  !autoGenerate && "pl-9",
                )}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Enter or scan gift card number"
                readOnly={autoGenerate}
              />
            </div>
            <p className="text-[12px] font-medium text-[#8A8A8A]">
              {autoGenerate ? "Auto-generated number" : "Or scan barcode"}
            </p>
          </div>

          <div className={SALES_DIALOG_FIELD_CLASS}>
            <Label htmlFor="gift-card-amount" className={SALES_DIALOG_LABEL_CLASS}>
              Amount
            </Label>
            <Input
              id="gift-card-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={SALES_DRAWER_FIELD_CLASS}
            />
          </div>

          <div className={SALES_DIALOG_FIELD_CLASS}>
            <Label className={SALES_DIALOG_LABEL_CLASS}>Owner client</Label>
            <SearchableSelect
              inDialog
              items={contactOptions}
              value={ownerContactId}
              onValueChange={setOwnerContactId}
              placeholder="Who will receive this gift card"
              triggerClassName={SALES_DRAWER_SELECT_TRIGGER_CLASS}
            />
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#E8E4DC] bg-white px-3">
            <Checkbox
              id="send-digital"
              checked={sendDigital}
              onCheckedChange={(checked) => setSendDigital(checked === true)}
              className="size-5 rounded-[4px] border-violet-primary-normal data-[checked]:border-violet-primary-normal data-[checked]:bg-violet-primary-normal"
            />
            <span className="text-[13px] font-medium leading-snug text-[#524346]">
              Email this gift card to the owner after checkout
            </span>
          </label>
        </div>

        <DialogFooter className={SALES_DIALOG_FOOTER_CLASS} sticky={false}>
          <Button
            type="button"
            variant="outline"
            className={SALES_DIALOG_SECONDARY_BUTTON_CLASS}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            className={DRAWER_PRIMARY_BUTTON_CLASS}
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
            {isPending ? "Adding…" : "Add to checkout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
