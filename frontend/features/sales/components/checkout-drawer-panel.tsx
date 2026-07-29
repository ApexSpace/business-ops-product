"use client";

import { useEffect } from "react";
import { Loader2, MoreHorizontal, Plus } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckoutChangePriceDialog } from "@/features/sales/components/checkout-change-price-dialog";
import { CheckoutInlineAddSection } from "@/features/sales/components/checkout-inline-add-section";
import { CheckoutLineItemRow } from "@/features/sales/components/checkout-line-item-row";
import { SaleClosePanel } from "@/features/sales/components/sale-close-panel";
import { useCheckoutPanel } from "@/features/sales/hooks/use-checkout-panel";
import { formatMoney } from "@/features/payments/utils/currencies";
import { DRAWER_FORM_STACK_CLASS } from "@/lib/design/drawer-shell-tokens";

export type CheckoutDrawerStep = "items" | "payment";

export interface CheckoutDrawerContactHeader {
  name: string;
  sinceLabel?: string | null;
}

export interface CheckoutDrawerSubmitAction {
  label: string;
  disabled: boolean;
  onClick: () => void;
}

export interface CheckoutDrawerPanelProps {
  checkoutId: string;
  step: CheckoutDrawerStep;
  contactHeader?: CheckoutDrawerContactHeader | null;
  onSubmitActionChange?: (action: CheckoutDrawerSubmitAction | null) => void;
  onComplete: () => void;
}

export function CheckoutDrawerPanel({
  checkoutId,
  step,
  contactHeader,
  onSubmitActionChange,
  onComplete,
}: CheckoutDrawerPanelProps) {
  const panel = useCheckoutPanel(checkoutId);

  useEffect(() => {
    if (step === "items") {
      onSubmitActionChange?.(null);
    }
  }, [step, onSubmitActionChange]);

  if (panel.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!panel.checkout) {
    return (
      <div className="px-1 py-10 text-center text-sm text-muted-foreground">
        {panel.loadError ?? "Unable to load this checkout."}
      </div>
    );
  }

  const checkout = panel.checkout;
  const contactName = contactHeader?.name ?? checkout.contact?.label ?? "Client";

  if (step === "payment") {
    return (
      <div className={DRAWER_FORM_STACK_CLASS}>
        <SaleClosePanel
          checkoutId={checkout.id}
          contactId={checkout.contactId}
          balanceDue={parseFloat(checkout.balanceDue)}
          embedInDrawer
          hideSubmitButton
          onSubmitActionChange={onSubmitActionChange}
          onComplete={() => {
            panel.refreshCheckout();
            onComplete();
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className={DRAWER_FORM_STACK_CLASS}>
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar name={contactName} className="size-11 shrink-0 text-sm" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-foreground">
              {contactName}
            </p>
            {contactHeader?.sinceLabel ? (
              <p className="text-[12px] text-muted-foreground">
                {contactHeader.sinceLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-0">
          {checkout.items.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              No items yet. Add a service or product below.
            </p>
          ) : (
            checkout.items.map((item) => (
              <CheckoutLineItemRow
                key={item.id}
                item={item}
                expanded={panel.expandedLineId === item.id}
                canEdit={panel.canEdit}
                staffItems={
                  item.serviceId && panel.expandedLineId === item.id
                    ? panel.expandedLineStaffItems
                    : []
                }
                removePending={panel.removeLineMutation.isPending}
                updatePending={panel.updateLineMutation.isPending}
                onToggle={() => panel.toggleExpandedLine(item.id)}
                onRemove={() => panel.removeLineMutation.mutate(item.id)}
                onChangePrice={() => panel.setChangePriceItem(item)}
                onUpdate={(body) =>
                  panel.updateLineMutation.mutate({ lineId: item.id, body })
                }
              />
            ))
          )}
        </div>

        {panel.canEdit ? (
          <>
            <div className="flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1">
              <button
                type="button"
                onClick={() => panel.setInlineAddMode("service")}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary hover:underline"
              >
                <Plus className="size-3.5" />
                Add service
              </button>
              <button
                type="button"
                onClick={() => panel.setInlineAddMode("product")}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary hover:underline"
              >
                <Plus className="size-3.5" />
                Add product
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary hover:underline"
                    >
                      <MoreHorizontal className="size-3.5" />
                      More
                    </button>
                  }
                />
                <DropdownMenuContent align="center" className="w-44">
                  <DropdownMenuItem
                    onClick={() => panel.setInlineAddMode("giftCard")}
                  >
                    Gift card
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => panel.setInlineAddMode("package")}
                  >
                    Package
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => panel.setInlineAddMode("offer")}
                  >
                    Offer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => panel.setInlineAddMode("accountBalance")}
                  >
                    Account balance
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <CheckoutInlineAddSection
              mode={panel.inlineAddMode}
              contactId={checkout.contactId}
              onClose={panel.closeInlineAdd}
              serviceItems={panel.serviceItems}
              selectedServiceId={panel.selectedServiceId}
              onServiceChange={panel.setSelectedServiceId}
              staffItems={panel.staffItems}
              selectedStaffId={panel.selectedStaffId}
              onStaffChange={panel.setSelectedStaffId}
              selectedMembershipKey={panel.selectedMembershipKey}
              onMembershipChange={panel.setSelectedMembershipKey}
              onAddService={() => panel.addServiceMutation.mutate()}
              servicePending={panel.addServiceMutation.isPending}
              productItems={panel.productItems}
              selectedProductKey={panel.selectedProductKey}
              onProductChange={panel.setSelectedProductKey}
              productQty={panel.productQty}
              onProductQtyChange={panel.setProductQty}
              onAddProduct={() => panel.addProductMutation.mutate()}
              productPending={panel.addProductMutation.isPending}
              offerItems={panel.offerItems}
              selectedOfferId={panel.selectedOfferId}
              onOfferChange={panel.setSelectedOfferId}
              onApplyOffer={() =>
                panel.selectedOfferId &&
                panel.applyOfferMutation.mutate(panel.selectedOfferId)
              }
              offerPending={panel.applyOfferMutation.isPending}
              depositAmount={panel.depositAmount}
              onDepositAmountChange={panel.setDepositAmount}
              onAddDeposit={() => panel.depositMutation.mutate()}
              depositPending={panel.depositMutation.isPending}
              onAddGiftCard={(values) => panel.giftCardMutation.mutate(values)}
              giftCardPending={panel.giftCardMutation.isPending}
              onAddPackage={(values) => panel.packageMutation.mutate(values)}
              packagePending={panel.packageMutation.isPending}
            />
          </>
        ) : null}
      </div>

      <CheckoutChangePriceDialog
        open={Boolean(panel.changePriceItem)}
        onOpenChange={(open) => {
          if (!open) panel.setChangePriceItem(null);
        }}
        regularPrice={
          panel.changePriceItem
            ? parseFloat(panel.changePriceItem.unitPrice)
            : 0
        }
        unitPrice={
          panel.changePriceItem
            ? parseFloat(panel.changePriceItem.unitPrice)
            : 0
        }
        isPending={panel.changePriceMutation.isPending}
        onApply={(unitPrice) => {
          if (!panel.changePriceItem) return;
          panel.changePriceMutation.mutate({
            lineId: panel.changePriceItem.id,
            unitPrice,
          });
        }}
      />
    </>
  );
}

export function getCheckoutDrawerSubtotal(checkout: { totalAmount: string }) {
  return formatMoney(parseFloat(checkout.totalAmount));
}
