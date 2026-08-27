"use client";

import { SlidersHorizontal } from "lucide-react";
import { IconButton, type IconButtonProps } from "@/components/ui/icon-button";
import { FILTER_ICON_BUTTON_CLASS } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

export type ListFilterButtonProps = Omit<
  IconButtonProps,
  "children" | "size"
> & {
  /** Shows the Figma active-filter dot on the icon. */
  active?: boolean;
  /** Appointments-style numeric badge; takes precedence over `active`. */
  count?: number;
  iconClassName?: string;
};

/**
 * Global list/calendar filter trigger. Chrome is `FILTER_ICON_BUTTON_CLASS`
 * (Appointments toolbar) — do not restyle per page.
 */
export function ListFilterButton({
  active = false,
  count,
  className,
  iconClassName,
  variant = "ghost",
  "aria-label": ariaLabel,
  ...props
}: ListFilterButtonProps) {
  const showCount = typeof count === "number" && count > 0;

  return (
    <IconButton
      variant={variant}
      size="icon"
      aria-label={ariaLabel}
      className={cn(FILTER_ICON_BUTTON_CLASS, className)}
      {...props}
    >
      <SlidersHorizontal
        className={cn("size-5 shrink-0 text-black", iconClassName)}
        strokeWidth={2}
      />
      {showCount ? (
        <span
          className="absolute -top-0.5 -right-0.5 inline-flex size-5 items-center justify-center rounded-full bg-violet-primary-normal text-[11px] font-semibold text-white"
          aria-hidden
        >
          {count}
        </span>
      ) : active ? (
        <span
          className="absolute top-1.5 right-1.5 size-2 rounded-full bg-violet-primary-normal"
          aria-hidden
        />
      ) : null}
    </IconButton>
  );
}
