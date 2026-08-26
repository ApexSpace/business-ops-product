/** Shared drawer footer action recipes. Width/header chrome lives on FormDrawerShell. */

/** Standard action button sizing for all drawer footers. */
export const DRAWER_FOOTER_BUTTON_CLASS =
  "h-[var(--control-height)] min-h-[var(--control-height)] min-w-[5.5rem] px-4 text-[13px] font-semibold";

/** Button group aligned to the bottom-right of a drawer footer. */
export const DRAWER_FOOTER_ACTIONS_CLASS =
  "flex w-full flex-col-reverse items-stretch gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end";

/** Standard drawer footer — actions pinned bottom-right. */
export const DRAWER_SHEET_FOOTER_CLASS =
  "flex-row flex-wrap items-center justify-end gap-2.5 border-t border-[var(--drawer-header-border)] bg-white px-6 py-drawer-footer-y";

/** Wider drawer footer padding (financial, appointment, work-item sheets). */
export const DRAWER_SHEET_FOOTER_WIDE_CLASS =
  "flex-row flex-wrap items-center justify-end gap-2.5 border-t border-[var(--drawer-header-border)] bg-white px-7 py-drawer-footer-y";
