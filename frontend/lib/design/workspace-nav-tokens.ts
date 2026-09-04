/**
 * Shared Settings / Reports workspace nav recipes.
 * Visual values come from globals.css tokens; this file is class composition only.
 */

/** Inner column — used when a parent already owns aside width/border (Settings chrome). */
export const WORKSPACE_NAV_PANEL_CLASS =
  "flex h-full min-h-0 flex-col pt-[var(--workspace-nav-padding-y)]";

/**
 * Self-contained master-detail aside (Team / Services / Resources / Offers).
 * Width 316px, neutral surface, trailing border — Figma settings workspace nav.
 */
export const WORKSPACE_NAV_ASIDE_CLASS =
  "flex h-full min-h-0 w-[var(--workspace-nav-width)] shrink-0 flex-col border-r border-border bg-muted/20 pt-[var(--workspace-nav-padding-y)]";

/**
 * Search (+ optional primary add) row — inset so the field fills ~284px in a 316px aside.
 * Forces SearchInput to full width (clears list-toolbar max-width).
 */
export const WORKSPACE_NAV_SEARCH_WRAP_CLASS =
  "shrink-0 space-y-[var(--workspace-nav-search-gap)] px-[var(--workspace-nav-padding-x)] pb-[var(--workspace-nav-search-gap)] [&_[data-slot=search-input]]:max-w-none [&_[data-slot=search-input]_input]:max-w-none";

/** Full-width brand CTA under search (Add Staff Member, Add Resource Group, …). */
export const WORKSPACE_NAV_PRIMARY_ADD_CLASS = "w-full";

/** Full-width scroll region; scrollbar track sits in the aside's right padding gutter. */
export const WORKSPACE_NAV_SCROLL_AREA_CLASS = "min-h-0 flex-1";

/** Nav list inset — used by nested accordion sidebars (Services / Resources). */
export const WORKSPACE_NAV_SCROLL_INNER_CLASS =
  "px-[var(--workspace-nav-padding-x)] pb-[var(--workspace-nav-padding-y)]";

/**
 * Flush list (no horizontal inset) — person rows own 30px padding and span the full aside.
 */
export const WORKSPACE_NAV_SCROLL_INNER_FLUSH_CLASS =
  "pb-[var(--workspace-nav-padding-y)]";

export const WORKSPACE_NAV_SECTION_TRIGGER_CLASS =
  "h-[var(--workspace-nav-section-height)] min-h-[var(--workspace-nav-section-height)] cursor-pointer items-center px-0 py-0 text-sm font-semibold leading-5 text-foreground hover:no-underline [&_[data-slot=accordion-trigger-icon]]:text-grey-tertiary-normal";

export const WORKSPACE_NAV_ITEM_CLASS =
  "flex h-[var(--workspace-nav-item-height)] min-h-[var(--workspace-nav-item-height)] min-w-0 cursor-pointer items-center gap-[var(--workspace-nav-item-gap)] rounded-[var(--radius-xs)] px-[var(--workspace-nav-item-padding-x)] text-sm leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30";

/**
 * Avatar + name rows (Team Members, …) — Figma 316×54, padding 10/30, gap 10.
 */
export const WORKSPACE_NAV_PERSON_ITEM_CLASS =
  "flex h-[var(--workspace-nav-person-item-height)] min-h-[var(--workspace-nav-person-item-height)] w-full min-w-0 cursor-pointer items-center gap-[var(--workspace-nav-person-item-gap)] px-[var(--workspace-nav-person-item-padding-x)] py-[var(--workspace-nav-person-item-padding-y)] text-sm leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30";

export const WORKSPACE_NAV_ITEM_ACTIVE_CLASS =
  "bg-violet-primary-surface font-medium text-violet-primary-normal";

export const WORKSPACE_NAV_ITEM_IDLE_CLASS =
  "text-foreground hover:bg-muted/40";

/** Nested row glyph — 12px Figma box; hit target stays on the row. */
export const WORKSPACE_NAV_ICON_CLASS =
  "size-[var(--workspace-nav-icon-size)] shrink-0";

export const WORKSPACE_NAV_NESTED_LIST_CLASS = "flex flex-col";
