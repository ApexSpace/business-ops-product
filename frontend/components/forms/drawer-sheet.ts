/** Shared slide-in shell styling for entity edit/create drawers. */
export const DRAWER_SHEET_CLASS =
  "[--sheet-width:min(92vw,480px)] shadow-elevation-lg";

export const DRAWER_SHEET_HEADER_CLASS =
  "border-b border-border/70 px-6 py-5 pr-14";

export const DRAWER_SHEET_TITLE_CLASS =
  "text-lg font-semibold tracking-tight";

export const DRAWER_SHEET_DESCRIPTION_CLASS =
  "mt-1 text-[13px] leading-relaxed text-muted-foreground";

export const DRAWER_SHEET_CONTENT_CLASS = "space-y-4 px-6 py-5";

/** Standard action button sizing for all drawer footers. */
export const DRAWER_FOOTER_BUTTON_CLASS =
  "h-[var(--control-height)] min-h-[var(--control-height)] min-w-[5.5rem] px-4 text-[13px] font-semibold";

/** Button group aligned to the bottom-right of a drawer footer. */
export const DRAWER_FOOTER_ACTIONS_CLASS =
  "flex w-full flex-col-reverse items-stretch gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end";

/** Standard drawer footer — actions pinned bottom-right. */
export const DRAWER_SHEET_FOOTER_CLASS =
  "flex-row flex-wrap items-center justify-end gap-2.5 border-t border-border/70 bg-background px-6 py-4";

/** Wider drawer footer padding (financial, appointment, work-item sheets). */
export const DRAWER_SHEET_FOOTER_WIDE_CLASS =
  "flex-row flex-wrap items-center justify-end gap-2.5 border-t border-border/70 bg-background px-7 py-4";
