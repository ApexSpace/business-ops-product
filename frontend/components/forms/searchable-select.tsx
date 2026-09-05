"use client";

import { useMemo } from "react";
import {
  Combobox,
  ComboboxFieldInput,
  ComboboxItemIndicator,
  ComboboxPopup,
  COMBOBOX_EMPTY_CLASS,
  COMBOBOX_ITEM_CLASS,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectItemMatchesQuery } from "@/lib/forms/filter-select-items";
import { CONTROL_HEIGHT_CLASS } from "@/lib/ui/control-styles";
import { SELECT_ALIGN_ITEM_WITH_TRIGGER, OVERLAY_SIDE } from "@/lib/ui/overlay-position";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/components/forms/select-field";
import { isOpaqueSelectValue } from "@/components/ui/select-item-labels";

export interface SearchableSelectProps {
  items: SelectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  /** @deprecated Search happens in the trigger input; kept for call-site compatibility. */
  searchPlaceholder?: string;
  emptyMessage?: string;
  /**
   * Label used when `value` is set but missing from `items` (e.g. options still loading).
   * Opaque IDs never display as the trigger text.
   */
  unresolvedLabel?: string;
  triggerClassName?: string;
  contentClassName?: string;
  id?: string;
  contentSide?: "top" | "bottom" | "left" | "right";
  contentAlign?: "start" | "center" | "end";
  /**
   * Base UI overlap mode. Default is false so the list opens under the field
   * (same as Appointment Client/Service). Do not enable for product selects.
   */
  alignItemWithTrigger?: boolean;
  /** Set false when the select is inside a modal dialog to avoid nested-modal focus traps. */
  modal?: boolean;
  /**
   * Use inside Dialog: sets modal={false} and portals the list to document body
   * (never into dialog content — overflow clipping breaks the popup).
   */
  inDialog?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Open the list as soon as the field mounts (inline add flows). */
  defaultOpen?: boolean;
}

function normalizeSelectValue(value: string | null): string | null {
  if (value == null || value === "") {
    return null;
  }
  return value;
}

function optionKey(value: string | null): string {
  return value ?? "__null__";
}

/** Keep a selected value labelable even when the option list has not loaded yet. */
function withUnresolvedSelection(
  items: SelectOption[],
  value: string | null,
  unresolvedLabel?: string,
  placeholder?: string,
): SelectOption[] {
  if (value == null) return items;
  if (items.some((item) => item.value === value)) return items;
  const label =
    unresolvedLabel ??
    (isOpaqueSelectValue(value) ? (placeholder ?? "Selected") : value);
  return [...items, { value, label }];
}

export function SearchableSelect({
  items = [],
  value,
  onValueChange,
  placeholder,
  disabled,
  searchable = true,
  emptyMessage = "No results found",
  unresolvedLabel,
  triggerClassName,
  contentClassName,
  id,
  contentSide = OVERLAY_SIDE,
  contentAlign = "center",
  alignItemWithTrigger = SELECT_ALIGN_ITEM_WITH_TRIGGER,
  modal = true,
  inDialog = false,
  onOpenChange,
  defaultOpen = false,
}: SearchableSelectProps) {
  const selectValue = normalizeSelectValue(value);

  const resolvedItems = useMemo(
    () =>
      withUnresolvedSelection(
        items,
        selectValue,
        unresolvedLabel,
        placeholder,
      ),
    [items, selectValue, unresolvedLabel, placeholder],
  );

  const itemsKey = resolvedItems
    .map((item) => `${item.value ?? "\u0000"}:${item.label}`)
    .join("|");

  const selectedItem = useMemo(
    () => resolvedItems.find((item) => item.value === selectValue) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itemsKey, selectValue],
  );

  if (!searchable) {
    return (
      <Select
        items={resolvedItems}
        value={selectValue}
        onValueChange={onValueChange}
        disabled={disabled}
        modal={inDialog ? false : modal}
        onOpenChange={onOpenChange}
      >
        <SelectTrigger
          id={id}
          disabled={disabled}
          className={cn(CONTROL_HEIGHT_CLASS, "w-full text-sm", triggerClassName)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          side={contentSide}
          align={contentAlign}
          alignItemWithTrigger={alignItemWithTrigger}
          className={cn("max-h-64", contentClassName)}
        >
          {items.length === 0 ? (
            <p className={COMBOBOX_EMPTY_CLASS}>{emptyMessage}</p>
          ) : (
            items.map((item) => (
              <SelectItem
                key={optionKey(item.value)}
                value={item.value}
                label={item.label}
              >
                {item.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Combobox.Root
      items={resolvedItems}
      value={selectedItem}
      onValueChange={(next) => onValueChange(next?.value ?? null)}
      disabled={disabled}
      modal={false}
      autoHighlight
      autoComplete="off"
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.value ?? ""}
      isItemEqualToValue={(left, right) => left.value === right.value}
      filter={(item, query) => selectItemMatchesQuery(item, query)}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
    >
      <ComboboxFieldInput
        id={id}
        disabled={disabled}
        placeholder={placeholder}
        className={triggerClassName}
      />
      <ComboboxPopup
        side={contentSide}
        align={contentAlign}
        className={contentClassName}
      >
        <Combobox.Empty className={COMBOBOX_EMPTY_CLASS}>
          {emptyMessage}
        </Combobox.Empty>
        <Combobox.List>
          {(item: SelectOption) => (
            <Combobox.Item
              key={optionKey(item.value)}
              value={item}
              disabled={item.disabled}
              className={cn(COMBOBOX_ITEM_CLASS, item.description && "items-start")}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.label}</span>
                {item.description ? (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                ) : null}
              </span>
              <ComboboxItemIndicator />
            </Combobox.Item>
          )}
        </Combobox.List>
      </ComboboxPopup>
    </Combobox.Root>
  );
}
