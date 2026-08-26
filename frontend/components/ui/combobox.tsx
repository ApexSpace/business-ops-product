"use client";

import type { ComponentProps } from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon } from "lucide-react";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { cn } from "@/lib/utils";

export const Combobox = ComboboxPrimitive;

/**
 * Shared field chrome. The visible control is the search input.
 * Never render a second `<input>` inside `ComboboxPopup` — typing here filters the list.
 */
export const COMBOBOX_INPUT_CLASS =
  "glass-control h-[var(--control-height)] w-full min-w-0 rounded-[var(--radius-control)] border border-input px-3 pr-8 text-sm transition-[border-color,box-shadow,background-color] duration-150 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary-tint disabled:cursor-not-allowed disabled:opacity-50";

export const COMBOBOX_POSITIONER_CLASS = "isolate z-[200]";

export const COMBOBOX_POPUP_CLASS =
  "glass-panel-strong relative isolate z-50 max-h-64 w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md text-popover-foreground ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 [&_[role=status]:empty]:hidden";

export const COMBOBOX_ITEM_CLASS =
  "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-2 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";

/**
 * Base UI keeps Combobox.Empty mounted (live region) even when the list has
 * items; `empty:hidden` collapses that leftover search-slot gap.
 */
export const COMBOBOX_EMPTY_CLASS =
  "empty:hidden px-2 py-2 text-center text-sm text-muted-foreground normal-case";

export const COMBOBOX_STATUS_CLASS =
  "empty:hidden px-2 py-2 text-center text-sm text-muted-foreground";

export const COMBOBOX_GROUP_LABEL_CLASS =
  "px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground";

export function ComboboxFieldInput({
  className,
  showIcon = true,
  ...props
}: ComponentProps<typeof ComboboxPrimitive.Input> & { showIcon?: boolean }) {
  return (
    <div className="relative w-full min-w-0">
      <ComboboxPrimitive.Input
        className={cn(COMBOBOX_INPUT_CLASS, className)}
        {...props}
      />
      {showIcon ? (
        <span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center text-muted-foreground">
          <NavArrowIcon direction="down" size="sm" />
        </span>
      ) : null}
    </div>
  );
}

export function ComboboxPopup({
  className,
  side = "bottom",
  align = "start",
  ...props
}: ComponentProps<typeof ComboboxPrimitive.Popup> &
  Pick<ComponentProps<typeof ComboboxPrimitive.Positioner>, "side" | "align">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={4}
        className={COMBOBOX_POSITIONER_CLASS}
      >
        <ComboboxPrimitive.Popup
          className={cn(COMBOBOX_POPUP_CLASS, className)}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

export function ComboboxItemIndicator() {
  return (
    <ComboboxPrimitive.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
      <CheckIcon className="pointer-events-none size-4" />
    </ComboboxPrimitive.ItemIndicator>
  );
}
