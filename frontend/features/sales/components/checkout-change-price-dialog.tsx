"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/features/payments/utils/currencies";
import {
  DRAWER_FIELD_CONTROL_CLASS,
  DRAWER_FIELD_LABEL_CLASS,
  DRAWER_FORM_FIELD_CLASS,
} from "@/lib/design/drawer-shell-tokens";

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
      <DialogContent className="z-[70] max-w-md gap-5">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-[17px] font-semibold">
            Change price
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Regular price</span>
            <span className="font-medium tabular-nums">
              {formatMoney(regularPrice)}
            </span>
          </div>

          <div className={DRAWER_FORM_FIELD_CLASS}>
            <Label className={DRAWER_FIELD_LABEL_CLASS}>Modified price</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              selectOnFocus
              value={modifiedPrice || ""}
              onChange={(event) => {
                setModifiedPrice(parseFloat(event.target.value) || 0);
                setDiscountPercent("");
              }}
              className={DRAWER_FIELD_CONTROL_CLASS}
            />
          </div>

          <div className={DRAWER_FORM_FIELD_CLASS}>
            <Label className={DRAWER_FIELD_LABEL_CLASS}>Discount</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              placeholder="e.g. 10%"
              value={discountPercent}
              onChange={(event) => setDiscountPercent(event.target.value)}
              className={DRAWER_FIELD_CONTROL_CLASS}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-4 text-[13px]">
            <span className="font-medium text-foreground">Final price</span>
            <span className="text-[15px] font-semibold tabular-nums">
              {formatMoney(finalPrice)}
            </span>
          </div>
        </div>

        <DialogFooter className="grid grid-cols-2 gap-3 border-0 bg-transparent p-0 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full uppercase tracking-[0.04em]"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 w-full uppercase tracking-[0.04em]"
            disabled={isPending || finalPrice < 0}
            onClick={() => onApply(finalPrice)}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
