"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { DrawerItemAddLayout } from "@/components/drawer/drawer-item-add-layout";
import { CheckoutAddActions } from "@/features/sales/components/checkout-add-actions";
import { CheckoutChangePriceDialog } from "@/features/sales/components/checkout-change-price-dialog";
import { CheckoutInlineAddSection } from "@/features/sales/components/checkout-inline-add-section";
import { CheckoutLineItemRow } from "@/features/sales/components/checkout-line-item-row";
import { SaleClosePanel } from "@/features/sales/components/sale-close-panel";
import {
  useCheckoutPanel,
  type InlineAddMode,
} from "@/features/sales/hooks/use-checkout-panel";
import { formatMoney } from "@/features/payments/utils/currencies";
import { getCheckoutCustomFeeLines } from "@/features/sales/utils/checkout-custom-fees";
import { checkoutHasStaffRequirementGaps } from "@/features/sales/utils/checkout-staff-requirements";
import {
  SALES_DRAWER_BODY_INSET_CLASS,
  SALES_DRAWER_CLIENT_AVATAR_CLASS,
  SALES_DRAWER_CLIENT_AVATAR_FALLBACK_CLASS,
  SALES_DRAWER_CLIENT_CARD_CLASS,
  SALES_DRAWER_CLIENT_NAME_CLASS,
  SALES_DRAWER_CLIENT_SINCE_CLASS,
  SALES_DRAWER_FORM_FIELDS_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";

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
  initialAddMode?: InlineAddMode;
  onInitialAddModeConsumed?: () => void;
  onSubmitActionChange?: (action: CheckoutDrawerSubmitAction | null) => void;
  onSubtotalChange?: (subtotalLabel: string | null) => void;
  onComplete: () => void;
}

export function CheckoutDrawerPanel({
  checkoutId,
  step,
  contactHeader,
  initialAddMode = null,
  onInitialAddModeConsumed,
  onSubmitActionChange,
  onSubtotalChange,
  onComplete,
}: CheckoutDrawerPanelProps) {
  const panel = useCheckoutPanel(checkoutId);

  useEffect(() => {
    if (step === "items") {
      onSubmitActionChange?.(null);
    }
  }, [step, onSubmitActionChange]);

  useEffect(() => {
    if (!panel.checkout || step !== "items") {
      onSubtotalChange?.(null);
      return;
    }
    onSubtotalChange?.(formatMoney(parseFloat(panel.checkout.subtotal)));
  }, [panel.checkout, step, onSubtotalChange]);

  useEffect(() => {
    if (!initialAddMode || !panel.canEdit) return;
    panel.setInlineAddMode(initialAddMode);
    onInitialAddModeConsumed?.();
    // Apply once when the panel mounts with a pending add intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutId, initialAddMode, panel.canEdit]);

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
  const customFeeLines = getCheckoutCustomFeeLines(checkout.items);
  const hasProductLines = checkout.items.some((item) => item.lineType === "PRODUCT");
  const staffBlocked = checkoutHasStaffRequirementGaps(
    checkout,
    checkout.advancedSettings,
  );

  if (step === "payment") {
    if (staffBlocked) {
      return (
        <div className={SALES_DRAWER_BODY_INSET_CLASS}>
          <p className="text-[13px] font-medium leading-relaxed text-destructive">
            Assign staff to all required line items before collecting payment.
          </p>
        </div>
      );
    }

    return (
      <div className={SALES_DRAWER_BODY_INSET_CLASS}>
        <SaleClosePanel
          checkoutId={checkout.id}
          contactId={checkout.contactId}
          balanceDue={parseFloat(checkout.balanceDue)}
          subtotal={parseFloat(checkout.subtotal)}
          customFeeLines={customFeeLines}
          advancedSettings={checkout.advancedSettings}
          hasProductLines={hasProductLines}
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
      <div className={SALES_DRAWER_BODY_INSET_CLASS}>
        <div className={SALES_DRAWER_FORM_FIELDS_CLASS}>
          <div className={SALES_DRAWER_CLIENT_CARD_CLASS}>
            <div className="flex min-h-12 items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <ProfileAvatar
                  name={contactName}
                  className={SALES_DRAWER_CLIENT_AVATAR_CLASS}
                  fallbackClassName={SALES_DRAWER_CLIENT_AVATAR_FALLBACK_CLASS}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className={SALES_DRAWER_CLIENT_NAME_CLASS}>{contactName}</p>
                  {contactHeader?.sinceLabel ? (
                    <p className={SALES_DRAWER_CLIENT_SINCE_CLASS}>
                      {contactHeader.sinceLabel}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <DrawerItemAddLayout
            items={
              <div className="flex w-full min-w-0 flex-col gap-3">
                {checkout.items.map((item) => (
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
                ))}
              </div>
            }
            editor={
              panel.canEdit ? (
                <CheckoutInlineAddSection
                  mode={panel.inlineAddMode}
                  contactId={checkout.contactId}
                  onClose={panel.closeInlineAdd}
                  serviceItems={panel.serviceItems}
                  onAddService={(serviceId) =>
                    panel.addServiceMutation.mutate(serviceId)
                  }
                  servicePending={panel.addServiceMutation.isPending}
                  productItems={panel.productItems}
                  onAddProduct={panel.handleAddProduct}
                  productPending={panel.addProductMutation.isPending}
                  pendingProductKey={panel.pendingProductKey}
                  productStaffItems={panel.productStaffItems}
                  productStaffId={panel.productStaffId}
                  onProductStaffChange={panel.setProductStaffId}
                  onConfirmPendingProduct={panel.confirmPendingProduct}
                  onCancelPendingProduct={() => {
                    panel.setPendingProductKey(null);
                    panel.setProductStaffId(null);
                  }}
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
                  onAddGiftCard={(values) =>
                    panel.giftCardMutation.mutate(values)
                  }
                  giftCardPending={panel.giftCardMutation.isPending}
                  onAddPackage={(values) => panel.packageMutation.mutate(values)}
                  packagePending={panel.packageMutation.isPending}
                />
              ) : null
            }
            actions={
              panel.canEdit ? (
                <CheckoutAddActions
                  onAddService={() => panel.setInlineAddMode("service")}
                  onAddProduct={() => panel.setInlineAddMode("product")}
                  onMoreSelect={(mode) => panel.setInlineAddMode(mode)}
                />
              ) : null
            }
          />
        </div>
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
