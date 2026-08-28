"use client";

import { useMemo } from "react";
import { DrawerHeaderContent } from "@/components/drawer/drawer-header-content";
import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";
import { DrawerShell } from "@/components/layout/drawer-shell";
import { Label } from "@/components/ui/label";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import {
  CheckoutAddActions,
  type CheckoutMoreMode,
} from "@/features/sales/components/checkout-add-actions";
import {
  SALES_DRAWER_BODY_INSET_CLASS,
  SALES_DRAWER_FIELD_GROUP_CLASS,
  SALES_DRAWER_FOOTER_CLASS,
  SALES_DRAWER_FOOTER_INNER_CLASS,
  SALES_DRAWER_FORM_FIELDS_CLASS,
  SALES_DRAWER_MOBILE_SHELL_CLASS,
  SALES_DRAWER_SHELL_CLASS,
  SALES_DRAWER_SHELL_HEADER_CLASS,
  SALES_DRAWER_SPINE_LABELS,
  SALES_DRAWER_SUBTOTAL_ROW_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
import { formatMoney } from "@/features/payments/utils/currencies";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { toast } from "sonner";

export interface NewCheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onContactIdChange: (id: string | null) => void;
  onCreate: () => void;
  onCreateAndAdd?: (mode: "service" | "product" | CheckoutMoreMode) => void;
  isPending?: boolean;
}

export function NewCheckoutDrawer({
  open,
  onOpenChange,
  contactId,
  onContactIdChange,
  onCreate,
  onCreateAndAdd,
  isPending = false,
}: NewCheckoutDrawerProps) {
  const isMobile = useIsMobile();
  const dateEyebrow = useMemo(
    () =>
      new Date()
        .toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
        .toUpperCase(),
    [],
  );

  const requireClientThen = (action: () => void) => {
    if (!contactId) {
      toast.error("Select a client first");
      return;
    }
    action();
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width="appointment"
      chrome={isMobile ? "mobile-brand" : "default"}
      spineLabel={isMobile ? undefined : SALES_DRAWER_SPINE_LABELS.checkout}
      className={
        isMobile ? SALES_DRAWER_MOBILE_SHELL_CLASS : SALES_DRAWER_SHELL_CLASS
      }
      headerClassName={
        isMobile ? undefined : SALES_DRAWER_SHELL_HEADER_CLASS
      }
      contentClassName="!px-0 !py-0"
      footerClassName={SALES_DRAWER_FOOTER_CLASS}
      title={
        isMobile ? (
          "Checkout"
        ) : (
          <DrawerHeaderContent eyebrow={dateEyebrow} title="Checkout" />
        )
      }
      footer={
        <div className={SALES_DRAWER_FOOTER_INNER_CLASS}>
          <div className={SALES_DRAWER_SUBTOTAL_ROW_CLASS}>
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(0)}</span>
          </div>
          <DrawerPrimaryButton
            disabled={!contactId || isPending}
            onClick={onCreate}
          >
            {isPending ? "Creating…" : "Go to Payments"}
          </DrawerPrimaryButton>
        </div>
      }
    >
      <div className={SALES_DRAWER_BODY_INSET_CLASS}>
        <div className={SALES_DRAWER_FORM_FIELDS_CLASS}>
          <div className={SALES_DRAWER_FIELD_GROUP_CLASS}>
            <Label className="text-[14px] font-medium leading-none text-[#524346]">
              Client
            </Label>
            <ContactPicker
              value={contactId ?? ""}
              onValueChange={(id) => onContactIdChange(id || null)}
              placeholder="Search or Create a Client"
              variant="drawer"
            />
          </div>

          <CheckoutAddActions
            disabled={isPending}
            onAddService={() =>
              requireClientThen(() =>
                onCreateAndAdd ? onCreateAndAdd("service") : onCreate(),
              )
            }
            onAddProduct={() =>
              requireClientThen(() =>
                onCreateAndAdd ? onCreateAndAdd("product") : onCreate(),
              )
            }
            onMoreSelect={(mode) =>
              requireClientThen(() =>
                onCreateAndAdd ? onCreateAndAdd(mode) : onCreate(),
              )
            }
          />
        </div>
      </div>
    </DrawerShell>
  );
}
