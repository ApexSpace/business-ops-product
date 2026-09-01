/**
 * Shared Settings / Reports workspace nav recipes.
 * Visual values come from globals.css tokens; this file is class composition only.
 */

export const WORKSPACE_NAV_PANEL_CLASS =
  "flex h-full min-h-0 flex-col pt-[var(--workspace-nav-padding-y)]";

/** Search row — inset from aside edges; scroll area below stays full width. */
export const WORKSPACE_NAV_SEARCH_WRAP_CLASS =
  "shrink-0 px-[var(--workspace-nav-padding-x)] pb-[var(--workspace-nav-search-gap)]";

/** Full-width scroll region; scrollbar track sits in the aside's right padding gutter. */
export const WORKSPACE_NAV_SCROLL_AREA_CLASS = "min-h-0 flex-1";

/** Nav list inset — symmetric padding keeps chevrons at the original inset from the aside edge. */
export const WORKSPACE_NAV_SCROLL_INNER_CLASS =
  "px-[var(--workspace-nav-padding-x)] pb-[var(--workspace-nav-padding-y)]";

export const WORKSPACE_NAV_SECTION_TRIGGER_CLASS =
  "h-[var(--workspace-nav-section-height)] min-h-[var(--workspace-nav-section-height)] cursor-pointer items-center px-0 py-0 text-sm font-semibold leading-5 text-foreground hover:no-underline [&_[data-slot=accordion-trigger-icon]]:text-grey-tertiary-normal";

export const WORKSPACE_NAV_ITEM_CLASS =
  "flex h-[var(--workspace-nav-item-height)] min-h-[var(--workspace-nav-item-height)] min-w-0 cursor-pointer items-center gap-[var(--workspace-nav-item-gap)] rounded-[var(--radius-xs)] px-[var(--workspace-nav-item-padding-x)] text-sm leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30";

export const WORKSPACE_NAV_ITEM_ACTIVE_CLASS =
  "bg-violet-primary-surface font-medium text-violet-primary-normal";

export const WORKSPACE_NAV_ITEM_IDLE_CLASS =
  "text-grey-tertiary-normal hover:bg-muted/40 hover:text-foreground";

/** Nested row glyph — 12px Figma box; hit target stays on the row. */
export const WORKSPACE_NAV_ICON_CLASS =
  "size-[var(--workspace-nav-icon-size)] shrink-0";

export const WORKSPACE_NAV_NESTED_LIST_CLASS = "flex flex-col";
