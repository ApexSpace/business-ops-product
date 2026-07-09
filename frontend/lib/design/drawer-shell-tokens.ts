/** Unified MangoMint-style drawer shell tokens. */

export const DRAWER_SHELL_WIDTH_COMPACT =
  "[--sheet-width:min(94vw,480px)]";

export const DRAWER_SHELL_WIDTH_STANDARD =
  "[--sheet-width:min(94vw,600px)]";

export const DRAWER_SHELL_WIDTH_WIDE = "[--sheet-width:min(94vw,640px)]";

export const DRAWER_SHELL_WIDTH_CONVERSATION =
  "[--sheet-width:min(70vw,900px)]";

export const DRAWER_SHELL_WIDTH_SPLIT = "[--sheet-width:min(94vw,900px)]";

export type DrawerShellWidthTier =
  | "compact"
  | "standard"
  | "wide"
  | "conversation"
  | "split";

export function drawerShellWidthClass(
  width: DrawerShellWidthTier = "standard",
): string {
  switch (width) {
    case "compact":
      return DRAWER_SHELL_WIDTH_COMPACT;
    case "wide":
      return DRAWER_SHELL_WIDTH_WIDE;
    case "conversation":
      return DRAWER_SHELL_WIDTH_CONVERSATION;
    case "split":
      return DRAWER_SHELL_WIDTH_SPLIT;
    default:
      return DRAWER_SHELL_WIDTH_STANDARD;
  }
}

export const DRAWER_SHELL_HEADER_CLASS =
  "relative shrink-0 border-b border-border/70 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_55%),linear-gradient(135deg,var(--background)_0%,color-mix(in_oklch,var(--primary)_4%,var(--background))_100%)] px-[30px] pb-[22px] pt-[26px]";

export const DRAWER_SHELL_HEADER_ROW_CLASS =
  "flex items-center justify-between gap-3";

/** MangoMint-style 34×34 header control — matches drawer close button */
export const DRAWER_SHELL_HEADER_ACTION_CLASS =
  "size-[34px] shrink-0 rounded-[9px] border border-border bg-background text-muted-foreground shadow-none hover:bg-muted/40 hover:text-foreground";

export const DRAWER_SHELL_TITLE_CLASS =
  "text-[21px] font-semibold tracking-tight";

export const DRAWER_SHELL_DESCRIPTION_CLASS =
  "mt-1 text-[13px] leading-relaxed text-muted-foreground";

export const DRAWER_SHELL_BODY_CLASS = "min-h-0 flex-1 overflow-y-auto !p-0";

export const DRAWER_SHELL_CONTENT_INSET_CLASS =
  "space-y-0 px-[30px] py-[26px] scrollbar-thin";

export const DRAWER_SHELL_FOOTER_CLASS =
  "flex-row flex-wrap items-center justify-end gap-2.5 border-t border-border/70 bg-background px-7 py-4";

export const DRAWER_FIELD_CONTROL_CLASS =
  "h-11 min-h-11 data-[size=default]:h-11 data-[size=sm]:h-11 rounded-[10px] border-[1.5px] text-[13.5px] shadow-none focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15";

export const DRAWER_FIELD_LABEL_CLASS =
  "flex items-center gap-1 text-[12.5px] font-semibold text-muted-foreground";

export const DRAWER_FORM_FIELD_CLASS = "flex flex-col gap-[7px]";

export const DRAWER_FORM_ITEM_CLASS = "mb-4 gap-[7px]";

export const DRAWER_FORM_DIVIDER_CLASS = "my-[22px] h-px bg-border/60";

/** Vertical gap between stacked fields/sections in compact drawers (create appointment baseline). */
export const DRAWER_FORM_STACK_CLASS = "space-y-5";

/** Compact sheet body horizontal inset — matches appointment create drawer. */
export const DRAWER_COMPACT_CONTENT_CLASS = "px-4";

/** Compact sheet footer inset — matches appointment create drawer. */
export const DRAWER_COMPACT_FOOTER_CLASS = "px-4 pt-3 pb-0";

/**
 * Edge-aligned scroll region for compact drawers: extends to the right sheet edge
 * so the scrollbar does not sit on top of list actions. Pair with
 * `DRAWER_SCROLL_CONTENT_INSET_CLASS` on the scroll child.
 */
export const DRAWER_SCROLL_EDGE_CLASS =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin -mr-4";

/** Right inset inside an edge-aligned scroll region — clears the scrollbar track. */
export const DRAWER_SCROLL_CONTENT_INSET_CLASS = "pr-4";

/** Full-width primary CTA sizing — pair with `DRAWER_FOOTER_BUTTON_CLASS`. */
export const DRAWER_PRIMARY_FOOTER_BUTTON_CLASS = "h-14 min-h-14 w-full";
