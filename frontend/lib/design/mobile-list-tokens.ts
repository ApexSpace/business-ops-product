/**
 * Design-token ownership
 * - Visual values: frontend/app/globals.css and frontend/lib/theme/*
 * - This file: mobile entity-list recipes only
 * - Features must not introduce new raw color / radius / height values
 *
 * Colors use theme CSS variables (--mobile-*, --drawer-*, violet brand utilities).
 */

/** Purple app bar — locked brand violet (not client --primary). */
export const MOBILE_LIST_HEADER_BG = "bg-violet-primary-normal";

/**
 * Shared mobile purple top bar shell — height + safe-area.
 * Hit-and-trial: `--mobile-top-bar-height` in globals.css (:root).
 */
export const MOBILE_TOP_BAR_SHELL_CLASS =
  "flex shrink-0 items-center justify-between gap-2 px-2 text-white h-[calc(var(--mobile-top-bar-height)+env(safe-area-inset-top,0px))] min-h-[calc(var(--mobile-top-bar-height)+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)]";

/** Fixed content row inside the top bar (below status bar). */
export const MOBILE_TOP_BAR_ROW_CLASS =
  "flex h-[var(--mobile-top-bar-height)] min-h-[var(--mobile-top-bar-height)] max-h-[var(--mobile-top-bar-height)] w-full items-center";

/** List / calendar mobile headers — background + shell. */
export const MOBILE_TOP_BAR_CLASS = `${MOBILE_LIST_HEADER_BG} ${MOBILE_TOP_BAR_SHELL_CLASS}`;

/**
 * Three-column grid inside the purple top bar — filter · title · action.
 * Matches appointments mobile header centering.
 */
export const MOBILE_TOP_BAR_HEADER_ROW_CLASS =
  "grid h-[var(--mobile-top-bar-height)] min-h-[var(--mobile-top-bar-height)] max-h-[var(--mobile-top-bar-height)] w-full grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-1";

/** Shared mobile page title — hit-and-trial via --mobile-page-title-* in globals.css. */
export const MOBILE_PAGE_TITLE_CLASS =
  "truncate text-center text-[length:var(--mobile-page-title-size)] font-[number:var(--mobile-page-title-weight)] leading-none text-white";

/**
 * Scroll slot below header/search — caps height so the body does not leave empty residue.
 */
export const MOBILE_LIST_BODY_SLOT_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden";

export const MOBILE_LIST_BODY_SCROLL_CLASS =
  "h-max max-h-full min-h-0 w-full overflow-y-auto overscroll-contain";

/** List item — Figma 24px vertical / 16px horizontal */
export const MOBILE_LIST_ITEM_CLASS =
  "flex w-full min-h-[44px] flex-col gap-1 border-b border-[var(--mobile-list-border)] px-4 py-6 text-left transition-colors active:bg-violet-primary-surface/40";

export const MOBILE_LIST_ITEM_ACTIVE_CLASS = "bg-violet-primary-surface/50";

export const MOBILE_LIST_PRIMARY_TEXT_CLASS =
  "truncate text-[15px] font-semibold leading-none text-[var(--drawer-text-primary)]";

export const MOBILE_LIST_AMOUNT_TEXT_CLASS =
  "shrink-0 text-[15px] font-bold leading-none tabular-nums text-[var(--drawer-text-primary)]";

export const MOBILE_LIST_META_TEXT_CLASS =
  "truncate text-[12px] font-normal leading-none text-[var(--mobile-list-meta)]";

export const MOBILE_LIST_STATUS_PILL_BASE_CLASS =
  "inline-flex max-w-full shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none";

export const MOBILE_LIST_STATUS_CLOSED_CLASS =
  "bg-[var(--mobile-status-closed-bg)] text-[var(--mobile-status-closed-fg)]";

export const MOBILE_LIST_STATUS_OPEN_CLASS =
  "bg-[var(--mobile-status-open-bg)] text-[var(--mobile-status-open-fg)]";

export const MOBILE_LIST_STATUS_VOID_CLASS =
  "bg-[var(--mobile-status-void-bg)] text-[var(--mobile-status-void-fg)]";

export const MOBILE_LIST_STATUS_NEUTRAL_CLASS =
  "bg-[var(--mobile-status-neutral-bg)] text-[var(--mobile-status-neutral-fg)]";

export const MOBILE_LIST_BOTTOM_NAV_HEIGHT_PX = 60;

export const MOBILE_LIST_SEARCH_WRAP_CLASS =
  "flex shrink-0 justify-center border-b border-[var(--mobile-list-search-border)] bg-white px-4 py-3";
