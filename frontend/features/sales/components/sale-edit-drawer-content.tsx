"use client";

import { DRAWER_PRIMARY_BUTTON_CLASS } from "@/lib/design/drawer-tokens";

import { Pencil } from "lucide-react";
import {
  DrawerChevronIcon,
  DrawerTrashIcon,
} from "@/components/drawer/drawer-icons";
import { DrawerItemAddLayout } from "@/components/drawer/drawer-item-add-layout";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import { CheckoutAddActions } from "@/features/sales/components/checkout-add-actions";
import { formatMoney } from "@/features/payments/utils/currencies";
import type { Checkout, CheckoutItem } from "@/features/sales/types/checkout";
import {
  SALES_DIALOG_META_LABEL_CLASS,
  SALES_DIALOG_META_ROW_CLASS,
  SALES_DIALOG_META_VALUE_CLASS,
  SALES_DIALOG_SECONDARY_BUTTON_CLASS,
  SALES_DIALOG_TOTAL_ROW_CLASS,
  SALES_DRAWER_BODY_INSET_CLASS,
  SALES_DRAWER_FIELD_CLASS,
  SALES_DRAWER_FIELD_GROUP_CLASS,
  SALES_DRAWER_FORM_FIELDS_CLASS,
  SALES_DRAWER_ICON_BUTTON_CLASS,
  SALES_DRAWER_LINE_CARD_CLASS,
  SALES_DRAWER_LINE_CARD_EXPANDED_CLASS,
  SALES_DRAWER_SELECT_TRIGGER_CLASS,
  SALES_DRAWER_SUMMARY_BLOCK_CLASS,
  SALES_DRAWER_TEXTAREA_CLASS,
  SALES_DRAWER_VIEW_FIELD_LABEL_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { cn } from "@/lib/utils";

export interface SaleEditDrawerContentProps {
  sale: Checkout;
  editContactId: string | null;
  editNotes: string;
  onEditContactIdChange: (id: string | null) => void;
  onEditNotesChange: (notes: string) => void;
  onAddService: () => void;
  onAddProduct: () => void;
  onAddGiftCard: () => void;
  onAddPackage: () => void;
  onApplyOffer: () => void;
  onAddDeposit?: () => void;
  onRemoveOffer: (offerId: string) => void;
  removeOfferPending: boolean;
  onEditLine: (item: CheckoutItem) => void;
  onRemoveLine: (lineId: string) => void;
  lineRemovePending: boolean;
  editingLine: CheckoutItem | null;
  lineQty: number;
  lineUnitPrice: number;
  lineStaffId: string | null;
  lineStaffItems: Array<{ value: string; label: string }>;
  onLineQtyChange: (qty: number) => void;
  onLineUnitPriceChange: (price: number) => void;
  onLineStaffIdChange: (id: string | null) => void;
  onCancelLineEdit: () => void;
  onSaveLineEdit: () => void;
  lineSavePending: boolean;
}

export function SaleEditDrawerContent({
  sale,
  editContactId,
  editNotes,
  onEditContactIdChange,
  onEditNotesChange,
  onAddService,
  onAddProduct,
  onAddGiftCard,
  onAddPackage,
  onApplyOffer,
  onAddDeposit,
  onRemoveOffer,
  removeOfferPending,
  onEditLine,
  onRemoveLine,
  lineRemovePending,
  editingLine,
  lineQty,
  lineUnitPrice,
  lineStaffId,
  lineStaffItems,
  onLineQtyChange,
  onLineUnitPriceChange,
  onLineStaffIdChange,
  onCancelLineEdit,
  onSaveLineEdit,
  lineSavePending,
}: SaleEditDrawerContentProps) {
  return (
    <div className={SALES_DRAWER_BODY_INSET_CLASS}>
      <div className={SALES_DRAWER_FORM_FIELDS_CLASS}>
        <div className={SALES_DRAWER_FIELD_GROUP_CLASS}>
          <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>Client</Label>
          <ContactPicker
            value={editContactId ?? ""}
            onValueChange={(id) => onEditContactIdChange(id || null)}
            placeholder="Search or create a client"
            variant="drawer"
          />
        </div>

        <div className={SALES_DRAWER_FIELD_GROUP_CLASS}>
          <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>Notes</Label>
          <Textarea
            value={editNotes}
            onChange={(e) => onEditNotesChange(e.target.value)}
            rows={3}
            placeholder="Add a note for this sale…"
            className={SALES_DRAWER_TEXTAREA_CLASS}
          />
        </div>

        <DrawerItemAddLayout
          items={
            <div className="flex w-full min-w-0 flex-col gap-3">
              {sale.items.length === 0 ? (
                <p className="rounded-[10px] border border-dashed border-[#E8E4DC] bg-violet-primary-surface/40 px-4 py-6 text-center text-[13px] font-medium text-[#8A8A8A]">
                  No line items yet. Add a service or product below.
                </p>
              ) : (
                sale.items.map((item) => {
              const isEditing = editingLine?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={cn(
                    isEditing
                      ? SALES_DRAWER_LINE_CARD_EXPANDED_CLASS
                      : SALES_DRAWER_LINE_CARD_CLASS,
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center text-[#8A8A8A]">
                      <DrawerChevronIcon
                        direction={isEditing ? "down" : "right"}
                      />
                    </span>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() =>
                        isEditing ? onCancelLineEdit() : onEditLine(item)
                      }
                    >
                      <p className="truncate text-[15px] font-bold leading-[19px] text-violet-primary-darker">
                        {item.title}
                      </p>
                      {!isEditing ? (
                        <p className="mt-1 text-[12px] font-medium text-[#8A8A8A]">
                          {item.lineType.replaceAll("_", " ").toLowerCase()}
                          {item.staff ? ` · ${item.staff.label}` : ""}
                          {` · qty ${item.quantity}`}
                        </p>
                      ) : null}
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                      {!isEditing ? (
                        <span className="text-[14px] font-bold tabular-nums text-violet-primary-darker">
                          {formatMoney(parseFloat(item.totalPrice))}
                        </span>
                      ) : null}
                      {!isEditing ? (
                        <button
                          type="button"
                          aria-label="Edit line"
                          className={cn(
                            SALES_DRAWER_ICON_BUTTON_CLASS,
                            "size-6 text-violet-primary-darker",
                          )}
                          onClick={() => onEditLine(item)}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Remove item"
                        disabled={lineRemovePending || isEditing}
                        className={cn(
                          SALES_DRAWER_ICON_BUTTON_CLASS,
                          "size-6 text-violet-primary-darker disabled:opacity-50 [&>svg]:size-5",
                        )}
                        onClick={() => onRemoveLine(item.id)}
                      >
                        <DrawerTrashIcon className="size-5" />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 space-y-3 pl-7">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                          <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>
                            Quantity
                          </Label>
                          <Input
                            type="number"
                            min={0.0001}
                            step="0.01"
                            value={lineQty || ""}
                            onChange={(e) =>
                              onLineQtyChange(parseFloat(e.target.value) || 0)
                            }
                            className={SALES_DRAWER_FIELD_CLASS}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>
                            Price
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            selectOnFocus
                            value={lineUnitPrice || ""}
                            onChange={(e) =>
                              onLineUnitPriceChange(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className={SALES_DRAWER_FIELD_CLASS}
                          />
                        </div>
                      </div>
                      {item.serviceId && lineStaffItems.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>
                            Provider
                          </Label>
                          <SearchableSelect
                            items={lineStaffItems}
                            value={lineStaffId}
                            onValueChange={onLineStaffIdChange}
                            placeholder="Provider (optional)"
                            triggerClassName={SALES_DRAWER_SELECT_TRIGGER_CLASS}
                          />
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className={SALES_DIALOG_SECONDARY_BUTTON_CLASS}
                          onClick={onCancelLineEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="brand"
                          className={DRAWER_PRIMARY_BUTTON_CLASS}
                          disabled={lineSavePending || lineQty <= 0}
                          onClick={onSaveLineEdit}
                        >
                          {lineSavePending ? "Saving…" : "Save line"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
            </div>
          }
          actions={
            <CheckoutAddActions
              onAddService={onAddService}
              onAddProduct={onAddProduct}
              onMoreSelect={(mode) => {
                if (mode === "giftCard") onAddGiftCard();
                else if (mode === "package") onAddPackage();
                else if (mode === "offer") onApplyOffer();
                else if (mode === "accountBalance") onAddDeposit?.();
                else onAddGiftCard();
              }}
            />
          }
        />

        <div className={SALES_DRAWER_SUMMARY_BLOCK_CLASS}>
          <div className={SALES_DIALOG_META_ROW_CLASS}>
            <span className={SALES_DIALOG_META_LABEL_CLASS}>Subtotal</span>
            <span className={SALES_DIALOG_META_VALUE_CLASS}>
              {formatMoney(parseFloat(sale.subtotal))}
            </span>
          </div>
          {(sale.appliedOffers ?? []).map((offer) => (
            <div
              key={offer.offerId}
              className="flex items-center justify-between gap-3 text-[13px] font-medium text-emerald-700"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">Offer: {offer.offerName}</span>
                <button
                  type="button"
                  className="shrink-0 text-[12px] font-semibold text-violet-primary-normal hover:underline disabled:opacity-50"
                  disabled={removeOfferPending}
                  onClick={() => onRemoveOffer(offer.offerId)}
                >
                  Remove
                </button>
              </span>
              <span className="tabular-nums">
                -{formatMoney(parseFloat(offer.totalDiscount))}
              </span>
            </div>
          ))}
          {parseFloat(sale.discountAmount) > 0 &&
          !(sale.appliedOffers?.length) ? (
            <div className="flex justify-between gap-3 text-[13px] font-medium text-emerald-700">
              <span>Discount</span>
              <span className="tabular-nums">
                -{formatMoney(parseFloat(sale.discountAmount))}
              </span>
            </div>
          ) : null}
          <div className={SALES_DIALOG_TOTAL_ROW_CLASS}>
            <span>Total</span>
            <span className="tabular-nums">
              {formatMoney(parseFloat(sale.totalAmount))}
            </span>
          </div>
          <div className={SALES_DIALOG_META_ROW_CLASS}>
            <span className={SALES_DIALOG_META_LABEL_CLASS}>Balance due</span>
            <span className={SALES_DIALOG_META_VALUE_CLASS}>
              {formatMoney(parseFloat(sale.balanceDue))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
