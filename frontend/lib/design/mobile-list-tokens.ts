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
  "shrink-0 border-b border-[var(--mobile-list-search-border)] bg-white px-4 py-3";
