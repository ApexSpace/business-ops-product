"use client";

import { DRAWER_PRIMARY_BUTTON_CLASS } from "@/lib/design/drawer-tokens";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/features/payments/utils/currencies";
import {
  SALES_DIALOG_BODY_CLASS,
  SALES_DIALOG_CONTENT_CLASS,
  SALES_DIALOG_DESCRIPTION_CLASS,
  SALES_DIALOG_FIELD_CLASS,
  SALES_DIALOG_FOOTER_CLASS,
  SALES_DIALOG_HEADER_CLASS,
  SALES_DIALOG_LABEL_CLASS,
  SALES_DIALOG_META_LABEL_CLASS,
  SALES_DIALOG_META_ROW_CLASS,
  SALES_DIALOG_META_VALUE_CLASS,
  SALES_DIALOG_SECONDARY_BUTTON_CLASS,
  SALES_DIALOG_TITLE_CLASS,
  SALES_DIALOG_TOTAL_ROW_CLASS,
  SALES_DRAWER_FIELD_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
import { cn } from "@/lib/utils";

export interface CheckoutChangePriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regularPrice: number;
  unitPrice: number;
  onApply: (unitPrice: number) => void;
  isPending?: boolean;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function CheckoutChangePriceDialog({
  open,
  onOpenChange,
  regularPrice,
  unitPrice,
  onApply,
  isPending = false,
}: CheckoutChangePriceDialogProps) {
  const [modifiedPrice, setModifiedPrice] = useState(unitPrice);
  const [discountPercent, setDiscountPercent] = useState("");

  useEffect(() => {
    if (!open) return;
    setModifiedPrice(unitPrice);
    setDiscountPercent("");
  }, [open, unitPrice]);

  const finalPrice = useMemo(() => {
    const discount = parseFloat(discountPercent);
    if (discountPercent.trim() && !Number.isNaN(discount)) {
      return roundMoney(regularPrice * (1 - discount / 100));
    }
    return roundMoney(modifiedPrice);
  }, [discountPercent, modifiedPrice, regularPrice]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        className={SALES_DIALOG_CONTENT_CLASS}
        showCloseButton
      >
        <DialogHeader className={SALES_DIALOG_HEADER_CLASS}>
          <DialogTitle className={SALES_DIALOG_TITLE_CLASS}>
            Change price
          </DialogTitle>
          <DialogDescription className={SALES_DIALOG_DESCRIPTION_CLASS}>
            Adjust the line price or apply a discount percentage.
          </DialogDescription>
        </DialogHeader>

        <div className={SALES_DIALOG_BODY_CLASS}>
          <div className={SALES_DIALOG_META_ROW_CLASS}>
            <span className={SALES_DIALOG_META_LABEL_CLASS}>Regular price</span>
            <span className={SALES_DIALOG_META_VALUE_CLASS}>
              {formatMoney(regularPrice)}
            </span>
          </div>

          <div className={SALES_DIALOG_FIELD_CLASS}>
            <Label
              htmlFor="checkout-modified-price"
              className={SALES_DIALOG_LABEL_CLASS}
            >
              Modified price
            </Label>
            <Input
              id="checkout-modified-price"
              type="number"
              min={0}
              step="0.01"
              selectOnFocus
              value={modifiedPrice || ""}
              onChange={(event) => {
                setModifiedPrice(parseFloat(event.target.value) || 0);
                setDiscountPercent("");
              }}
              className={SALES_DRAWER_FIELD_CLASS}
            />
          </div>

          <div className={SALES_DIALOG_FIELD_CLASS}>
            <Label
              htmlFor="checkout-discount-percent"
              className={SALES_DIALOG_LABEL_CLASS}
            >
              Discount
            </Label>
            <div className="relative">
              <Input
                id="checkout-discount-percent"
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="e.g. 10"
                value={discountPercent}
                onChange={(event) => setDiscountPercent(event.target.value)}
                className={cn(SALES_DRAWER_FIELD_CLASS, "pr-9")}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] font-medium text-[#8A8A8A]">
                %
              </span>
            </div>
          </div>

          <div className={SALES_DIALOG_TOTAL_ROW_CLASS}>
            <span>Final price</span>
            <span className="tabular-nums">{formatMoney(finalPrice)}</span>
          </div>
        </div>

        <DialogFooter className={SALES_DIALOG_FOOTER_CLASS} sticky={false}>
          <Button
            type="button"
            variant="outline"
            className={SALES_DIALOG_SECONDARY_BUTTON_CLASS}
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            className={DRAWER_PRIMARY_BUTTON_CLASS}
            disabled={isPending || finalPrice < 0}
            onClick={() => onApply(finalPrice)}
          >
            {isPending ? "Applying…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
