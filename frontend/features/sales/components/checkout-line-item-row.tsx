"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/forms/searchable-select";
import type { CheckoutItem } from "@/features/sales/types/checkout";
import { formatMoney } from "@/features/payments/utils/currencies";
import {
  DRAWER_FIELD_CONTROL_CLASS,
  DRAWER_FIELD_LABEL_CLASS,
  DRAWER_FORM_FIELD_CLASS,
} from "@/lib/design/drawer-shell-tokens";
import { cn } from "@/lib/utils";

export interface CheckoutLineItemRowProps {
  item: CheckoutItem;
  expanded: boolean;
  canEdit: boolean;
  staffItems?: Array<{ value: string; label: string }>;
  removePending?: boolean;
  updatePending?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onChangePrice: () => void;
  onUpdate: (body: {
    quantity?: number;
    unitPrice?: number;
    staffUserId?: string | null;
  }) => void;
}

export function CheckoutLineItemRow({
  item,
  expanded,
  canEdit,
  staffItems = [],
  removePending = false,
  updatePending = false,
  onToggle,
  onRemove,
  onChangePrice,
  onUpdate,
}: CheckoutLineItemRowProps) {
  const [quantity, setQuantity] = useState(parseFloat(item.quantity));
  const [staffUserId, setStaffUserId] = useState<string | null>(
    item.staffUserId ?? null,
  );

  useEffect(() => {
    setQuantity(parseFloat(item.quantity));
    setStaffUserId(item.staffUserId ?? null);
  }, [item.id, item.quantity, item.staffUserId]);

  const isProduct = item.lineType === "PRODUCT";
  const showStaff = Boolean(item.serviceId && staffItems.length > 0);
  const staffLabel = item.staff?.label ?? "no staff";

  const commitQuantity = (nextQty: number) => {
    if (nextQty <= 0 || nextQty === parseFloat(item.quantity)) return;
    onUpdate({ quantity: nextQty });
  };

  const unitPriceLabel = formatMoney(parseFloat(item.unitPrice));

  return (
    <div className="border-b border-border/60 py-3 last:border-b-0">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 shrink-0 text-muted-foreground/70 hover:text-foreground"
          aria-label={expanded ? "Collapse line item" : "Expand line item"}
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-[14px] font-semibold text-foreground">
            {item.title}
          </p>
          {!expanded ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {item.staff ? `with ${item.staff.label}` : `sold by ${staffLabel}`}
            </p>
          ) : null}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[14px] font-semibold tabular-nums">
            {formatMoney(parseFloat(item.totalPrice))}
          </span>
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8 text-muted-foreground hover:text-destructive"
              disabled={removePending || updatePending}
              onClick={onRemove}
              aria-label="Remove item"
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="mt-2.5 ml-6 rounded-[10px] border border-border/70 bg-muted/10 p-3.5">
          {isProduct ? (
            <div className="grid grid-cols-2 gap-3">
              <div className={DRAWER_FORM_FIELD_CLASS}>
                <Label className={DRAWER_FIELD_LABEL_CLASS}>Quantity</Label>
                <Input
                  type="number"
                  min={0.0001}
                  step="1"
                  value={quantity || ""}
                  disabled={!canEdit || updatePending}
                  onChange={(event) =>
                    setQuantity(parseFloat(event.target.value) || 0)
                  }
                  onBlur={() => commitQuantity(quantity)}
                  className={DRAWER_FIELD_CONTROL_CLASS}
                />
              </div>

              <div className={DRAWER_FORM_FIELD_CLASS}>
                <Label className={DRAWER_FIELD_LABEL_CLASS}>Unit price</Label>
                <div className="flex h-11 items-center justify-between gap-2 rounded-[10px] border-[1.5px] border-border/80 bg-background px-3">
                  <span className="text-[14px] font-semibold tabular-nums text-foreground">
                    {unitPriceLabel}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={onChangePrice}
                      className="shrink-0 text-[12px] font-medium text-primary hover:underline"
                    >
                      Change
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-[12.5px] font-medium text-muted-foreground">
                Price
              </span>
              <div className="flex min-w-0 items-center justify-end gap-2.5">
                <span className="text-[15px] font-semibold tabular-nums text-foreground">
                  {unitPriceLabel}
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={onChangePrice}
                    className="shrink-0 text-[12px] font-medium text-primary hover:underline"
                  >
                    Change price
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {showStaff ? (
            <div
              className={cn(
                DRAWER_FORM_FIELD_CLASS,
                isProduct ? "mt-3" : "mt-3 border-t border-border/50 pt-3",
              )}
            >
              <Label className={DRAWER_FIELD_LABEL_CLASS}>Staff</Label>
              <SearchableSelect
                items={staffItems}
                value={staffUserId}
                disabled={!canEdit || updatePending}
                onValueChange={(value) => {
                  setStaffUserId(value);
                  onUpdate({ staffUserId: value });
                }}
                placeholder="Select staff"
                triggerClassName={DRAWER_FIELD_CONTROL_CLASS}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
