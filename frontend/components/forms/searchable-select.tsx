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
import { filterSelectItems } from "@/lib/filter-select-items";
import { CONTROL_HEIGHT_CLASS } from "@/lib/control-styles";
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
  id?: string;
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
  id,
}: SearchableSelectProps) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(
    () => (searchable ? filterSelectItems(items, search) : items),
    [items, search, searchable],
  );

  return (
    <Select
      items={items}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
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
      <SelectContent>
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
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
