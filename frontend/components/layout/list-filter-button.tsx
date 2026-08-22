"use client";

import { SlidersHorizontal } from "lucide-react";
import { IconButton, type IconButtonProps } from "@/components/ui/icon-button";
import { DATA_TABLE_FILTER_ICON_CLASS } from "@/lib/design/data-table-tokens";
import { cn } from "@/lib/utils";

export type ListFilterButtonProps = Omit<IconButtonProps, "children" | "size"> & {
  /** Shows the Figma active-filter dot on the icon. */
  active?: boolean;
};

/**
 * Figma list filter icon — 56×44, radius/md, beside search.
 * Place via ListToolbar `filters` (renders to the right of search).
 */
export function ListFilterButton({
  active = false,
  className,
  variant = "outline",
  "aria-label": ariaLabel,
  ...props
}: ListFilterButtonProps) {
  return (
    <IconButton
      variant={variant}
      size="icon"
      aria-label={ariaLabel}
      className={cn(DATA_TABLE_FILTER_ICON_CLASS, "relative", className)}
      {...props}
    >
      <SlidersHorizontal
        className="size-5 shrink-0 text-black"
        strokeWidth={2}
      />
      {active ? (
        <span
          className="absolute top-1.5 right-1.5 size-2 rounded-full bg-violet-primary-normal"
          aria-hidden
        />
      ) : null}
    </IconButton>
  );
}
