"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchInput } from "@/components/forms/search-input";
import { cn } from "@/lib/utils";
import type { FieldType } from "@/features/forms/types";
import { useFormFieldPalette } from "@/features/forms/hooks/use-form-metadata";
import { getFieldTypeIcon } from "@/features/forms/utils/field-type-icons";
import { FORMS_BUILDER_INSERT_BUTTON_CLASS } from "@/lib/design/forms-builder-tokens";

const DISALLOWED_IN_COLUMN_TYPES = new Set<FieldType>([
  "columns",
  "hidden",
  "captcha",
  "collect_payment",
]);

interface InsertFieldPopoverProps {
  onAddField: (type: FieldType) => void;
  columnAdd?: boolean;
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
}

export function InsertFieldPopover({
  onAddField,
  columnAdd = false,
  className,
  buttonClassName,
  ariaLabel = "Add field",
}: InsertFieldPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: palette = [], isLoading } = useFormFieldPalette({
    status: "implemented",
    search: search.trim() || undefined,
  });

  const categories = palette
    .map((category) => ({
      ...category,
      fields: category.fields.filter((field) => {
        const type = field.key as FieldType;
        if (columnAdd && DISALLOWED_IN_COLUMN_TYPES.has(type)) return false;
        if (!search.trim()) return true;
        return field.label.toLowerCase().includes(search.trim().toLowerCase());
      }),
    }))
    .filter((category) => category.fields.length > 0);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger
        className={cn(FORMS_BUILDER_INSERT_BUTTON_CLASS, buttonClassName, className)}
        aria-label={ariaLabel}
      >
        <Plus className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-72 p-[var(--spacing-2)]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search fields…"
        />
        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 px-1 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading field types…
            </div>
          ) : null}
          {!isLoading && categories.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">
              No fields match your search.
            </p>
          ) : null}
          {categories.map((category) => (
            <div key={category.key} className="py-1">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {category.label}
              </p>
              <div className="flex flex-col">
                {category.fields.map((field) => {
                  const type = field.key as FieldType;
                  const Icon = getFieldTypeIcon(type, field.icon);
                  return (
                    <button
                      key={field.key}
                      type="button"
                      className="flex items-center gap-[var(--spacing-2)] rounded-md px-[var(--spacing-2)] py-1.5 text-left text-sm hover:bg-violet-primary-surface"
                      onClick={() => {
                        onAddField(type);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Icon className="size-4 shrink-0 text-violet-primary-normal" />
                      <span className="min-w-0 truncate">{field.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
