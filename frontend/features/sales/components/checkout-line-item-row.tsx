"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import {
  DrawerChevronIcon,
  DrawerTrashIcon,
} from "@/components/drawer/drawer-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { SearchableSelect } from "@/components/forms/searchable-select";
import type { CheckoutItem } from "@/features/sales/types/checkout";
import { formatMoney } from "@/features/payments/utils/currencies";
import {
  SALES_DRAWER_FIELD_CLASS,
  SALES_DRAWER_FIELD_GROUP_CLASS,
  SALES_DRAWER_ICON_BUTTON_CLASS,
  SALES_DRAWER_LINE_CARD_CHEVRON_CLASS,
  SALES_DRAWER_LINE_CARD_CLASS,
  SALES_DRAWER_LINE_CARD_EXPANDED_BODY_CLASS,
  SALES_DRAWER_LINE_CARD_EXPANDED_CLASS,
  SALES_DRAWER_LINE_CARD_FIELD_GRID_CLASS,
  SALES_DRAWER_LINE_CARD_HEADER_TOGGLE_CLASS,
  SALES_DRAWER_PROVIDER_PILL_CLASS,
  SALES_DRAWER_SELECT_TRIGGER_CLASS,
  SALES_DRAWER_VIEW_FIELD_LABEL_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
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
  const showStaff = Boolean(item.serviceId);
  const staffLabel = item.staff?.label ?? null;
  const unitPriceLabel = formatMoney(parseFloat(item.unitPrice));
  const lineTotalLabel = formatMoney(parseFloat(item.totalPrice));
  const busy = removePending || updatePending;

  return (
    <div
      className={cn(
        expanded
          ? SALES_DRAWER_LINE_CARD_EXPANDED_CLASS
          : SALES_DRAWER_LINE_CARD_CLASS,
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={SALES_DRAWER_LINE_CARD_HEADER_TOGGLE_CLASS}
          aria-label={expanded ? "Collapse line item" : "Expand line item"}
          aria-expanded={expanded}
        >
          <span className={SALES_DRAWER_LINE_CARD_CHEVRON_CLASS}>
            <DrawerChevronIcon direction={expanded ? "down" : "right"} />
          </span>
          <span className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[15px] font-bold leading-[19px] text-violet-primary-darker">
              {item.title}
            </p>
            {!expanded && staffLabel ? (
              <div className="mt-1">
                <span className={SALES_DRAWER_PROVIDER_PILL_CLASS}>
                  <ProfileAvatar
                    name={staffLabel}
                    className="size-4 text-[8px]"
                  />
                  <span className="min-w-0 truncate">{staffLabel}</span>
                </span>
              </div>
            ) : null}
            {!expanded && !staffLabel && showStaff ? (
              <p className="mt-1 text-[12px] font-medium leading-[15px] text-[#8A8A8A]">
                sold by no staff
              </p>
            ) : null}
          </span>
          {!expanded ? (
            <span className="shrink-0 pt-0.5 text-[14px] font-bold tabular-nums leading-[18px] text-violet-primary-darker">
              {lineTotalLabel}
            </span>
          ) : null}
        </button>

        {canEdit && expanded ? (
          <button
            type="button"
            aria-label="Remove item"
            disabled={busy}
            className={cn(
              SALES_DRAWER_ICON_BUTTON_CLASS,
              "size-6 shrink-0 text-violet-primary-darker disabled:opacity-50 [&>svg]:size-5",
            )}
            onClick={onRemove}
          >
            <DrawerTrashIcon className="size-5" />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className={SALES_DRAWER_LINE_CARD_EXPANDED_BODY_CLASS}>
          {isProduct ? (
            <div className={SALES_DRAWER_LINE_CARD_FIELD_GRID_CLASS}>
              <div className={SALES_DRAWER_FIELD_GROUP_CLASS}>
                <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>
                  Quantity
                </Label>
                <Input
                  type="number"
                  min={0.0001}
                  step="1"
                  value={quantity || ""}
                  disabled={!canEdit || updatePending}
                  onChange={(event) =>
                    setQuantity(parseFloat(event.target.value) || 0)
                  }
                  onBlur={() => {
                    if (quantity <= 0 || quantity === parseFloat(item.quantity)) {
                      return;
                    }
                    onUpdate({ quantity });
                  }}
                  className={SALES_DRAWER_FIELD_CLASS}
                />
              </div>
              <div className={SALES_DRAWER_FIELD_GROUP_CLASS}>
                <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>
                  Price
                </Label>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={onChangePrice}
                  className={cn(
                    SALES_DRAWER_FIELD_CLASS,
                    "flex items-center justify-between gap-2 text-left",
                    canEdit && "cursor-pointer hover:border-violet-primary-normal",
                  )}
                >
                  <span className="text-[14px] font-semibold tabular-nums text-foreground">
                    {unitPriceLabel}
                  </span>
                  {canEdit ? (
                    <Pencil
                      className="size-3.5 shrink-0 text-violet-primary-normal"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </div>
            </div>
          ) : (
            <div className={SALES_DRAWER_FIELD_GROUP_CLASS}>
              <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>Price</Label>
              <button
                type="button"
                disabled={!canEdit}
                onClick={onChangePrice}
                className={cn(
                  SALES_DRAWER_FIELD_CLASS,
                  "flex items-center justify-between gap-2 text-left",
                  canEdit && "cursor-pointer hover:border-violet-primary-normal",
                )}
              >
                <span className="text-[14px] font-semibold tabular-nums text-foreground">
                  {unitPriceLabel}
                </span>
                {canEdit ? (
                  <Pencil
                    className="size-3.5 shrink-0 text-violet-primary-normal"
                    aria-hidden
                  />
                ) : null}
              </button>
            </div>
          )}

          {showStaff ? (
            <div className={SALES_DRAWER_FIELD_GROUP_CLASS}>
              <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>
                Provider
              </Label>
              <SearchableSelect
                items={
                  staffItems.length > 0
                    ? staffItems
                    : staffLabel
                      ? [{ value: staffUserId ?? "", label: staffLabel }]
                      : []
                }
                value={staffUserId}
                disabled={!canEdit || updatePending || staffItems.length === 0}
                onValueChange={(value) => {
                  setStaffUserId(value);
                  onUpdate({ staffUserId: value });
                }}
                placeholder="Select provider"
                triggerClassName={SALES_DRAWER_SELECT_TRIGGER_CLASS}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
