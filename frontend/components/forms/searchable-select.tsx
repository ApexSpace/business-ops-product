"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSearch,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { filterSelectItems } from "@/lib/forms/filter-select-items";
import { CONTROL_HEIGHT_CLASS } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/components/forms/select-field";

export interface SearchableSelectProps {
  items: SelectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  triggerClassName?: string;
  contentClassName?: string;
  id?: string;
  contentSide?: "top" | "bottom" | "left" | "right";
  contentAlign?: "start" | "center" | "end";
  alignItemWithTrigger?: boolean;
  /** Set false when the select is inside a modal dialog to avoid nested-modal focus traps. */
  modal?: boolean;
  /**
   * Use inside Dialog: sets modal={false} and portals the list to document body
   * (never into dialog content — overflow clipping breaks the popup).
   */
  inDialog?: boolean;
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

export function SearchableSelect({
  items,
  value,
  onValueChange,
  placeholder,
  disabled,
  searchable = true,
  searchPlaceholder = "Search…",
  emptyMessage = "No results found",
  triggerClassName,
  contentClassName,
  id,
  contentSide = "bottom",
  contentAlign = "center",
  alignItemWithTrigger = true,
  modal = true,
  inDialog = false,
}: SearchableSelectProps) {
  const [search, setSearch] = useState("");
  const selectValue = normalizeSelectValue(value);

  const filteredItems = useMemo(
    () => (searchable ? filterSelectItems(items, search) : items),
    [items, search, searchable],
  );

  return (
    <Select
      items={filteredItems}
      value={selectValue}
      onValueChange={onValueChange}
      disabled={disabled}
      modal={inDialog ? false : modal}
      onOpenChange={(open) => {
        if (!open) {
          setSearch("");
        }
      }}
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
        {searchable ? (
          <SelectSearch
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
          />
        ) : null}
        {filteredItems.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground normal-case">
            {emptyMessage}
          </p>
        ) : (
          filteredItems.map((item) => (
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
