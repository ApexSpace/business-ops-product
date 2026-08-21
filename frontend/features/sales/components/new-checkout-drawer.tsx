"use client";

import { useMemo } from "react";
import { MoreHorizontal } from "lucide-react";
import { DrawerHeaderContent } from "@/components/drawer/drawer-header-content";
import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { DrawerShell } from "@/components/layout/drawer-shell";
import { IconButton } from "@/components/ui/icon-button";
import { Label } from "@/components/ui/label";
import {
  SALES_DRAWER_BODY_INSET_CLASS,
  SALES_DRAWER_FIELD_CLASS,
  SALES_DRAWER_FOOTER_CLASS,
  SALES_DRAWER_FOOTER_INNER_CLASS,
  SALES_DRAWER_FORM_FIELDS_CLASS,
  SALES_DRAWER_HEADER_ACTION_CLASS,
  SALES_DRAWER_SHELL_CLASS,
  SALES_DRAWER_SHELL_HEADER_CLASS,
  SALES_DRAWER_SPINE_LABELS,
} from "@/features/sales/styles/sales-drawer-tokens";

export interface NewCheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactItems: Array<{ value: string; label: string }>;
  contactId: string | null;
  onContactIdChange: (id: string | null) => void;
  onCreate: () => void;
  isPending?: boolean;
}

export function NewCheckoutDrawer({
  open,
  onOpenChange,
  contactItems,
  contactId,
  onContactIdChange,
  onCreate,
  isPending = false,
}: NewCheckoutDrawerProps) {
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

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width="appointment"
      spineLabel={SALES_DRAWER_SPINE_LABELS.checkout}
      className={SALES_DRAWER_SHELL_CLASS}
      headerClassName={SALES_DRAWER_SHELL_HEADER_CLASS}
      contentClassName="!px-0 !py-0"
      footerClassName={SALES_DRAWER_FOOTER_CLASS}
      title={
        <DrawerHeaderContent eyebrow={dateEyebrow} title="Checkout" />
      }
      headerActions={
        <IconButton
          type="button"
          variant="ghost"
          aria-label="More actions"
          className={SALES_DRAWER_HEADER_ACTION_CLASS}
        >
          <MoreHorizontal className="size-4" />
        </IconButton>
      }
      footer={
        <div className={SALES_DRAWER_FOOTER_INNER_CLASS}>
          <DrawerPrimaryButton
            disabled={!contactId || isPending}
            onClick={onCreate}
          >
            {isPending ? "Creating…" : "Start checkout"}
          </DrawerPrimaryButton>
        </div>
      }
    >
      <div className={SALES_DRAWER_BODY_INSET_CLASS}>
        <div className={SALES_DRAWER_FORM_FIELDS_CLASS}>
          <div className="flex flex-col gap-2">
            <Label className="text-[12.5px] font-semibold text-muted-foreground">
              Client
            </Label>
            <SearchableSelect
              items={contactItems}
              value={contactId}
              onValueChange={onContactIdChange}
              placeholder="Search or create a client"
              triggerClassName={SALES_DRAWER_FIELD_CLASS}
            />
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
