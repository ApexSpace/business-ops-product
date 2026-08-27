"use client";

import { SearchableSelect } from "@/components/forms/searchable-select";
import { SALES_DRAWER_SELECT_TRIGGER_CLASS } from "@/features/sales/styles/sales-drawer-tokens";

export interface CheckoutItemPickerProps {
  items: Array<{ value: string; label: string }>;
  placeholder: string;
  pending?: boolean;
  inDialog?: boolean;
  onSelect: (value: string) => void;
}

/**
 * Search/list picker that adds a checkout line as soon as an item is chosen.
 * Used for Add service / Add product (and similar pick-one line actions).
 */
export function CheckoutItemPicker({
  items,
  placeholder,
  pending = false,
  inDialog = false,
  onSelect,
}: CheckoutItemPickerProps) {
  return (
    <SearchableSelect
      items={items}
      value={null}
      onValueChange={(value) => {
        if (!value || pending) return;
        onSelect(value);
      }}
      placeholder={placeholder}
      disabled={pending}
      defaultOpen
      inDialog={inDialog}
      triggerClassName={SALES_DRAWER_SELECT_TRIGGER_CLASS}
    />
  );
}
