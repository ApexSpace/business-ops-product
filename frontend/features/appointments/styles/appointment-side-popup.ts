/**
 * PandaCue Figma “Side Popup” tokens for appointment drawers.
 * Width 378px · Primary #7E3BED · Divider #BC9BF6 · Field border #D1D1D1
 */

export const APPOINTMENT_POPUP_WIDTH =
  "[--sheet-width:min(94vw,378px)]";

export const APPOINTMENT_POPUP_PRIMARY = "#7E3BED";
export const APPOINTMENT_POPUP_DIVIDER = "#BC9BF6";
export const APPOINTMENT_POPUP_FIELD_BORDER = "#D1D1D1";
export const APPOINTMENT_POPUP_CONFIRMED_BG = "#E8F5EF";
export const APPOINTMENT_POPUP_CONFIRMED_FG = "#1C9A5B";

export const APPOINTMENT_POPUP_SHELL_CLASS =
  "bg-white shadow-[0_8px_32px_rgba(44,21,83,0.12)]";

export const APPOINTMENT_POPUP_HEADER_CLASS =
  "relative shrink-0 border-b border-[#E6E6E6] bg-white px-5 pb-3 pt-5";

export const APPOINTMENT_POPUP_TITLE_CLASS =
  "text-[20px] font-bold leading-none tracking-normal text-[#7E3BED]";

export const APPOINTMENT_POPUP_DESCRIPTION_CLASS =
  "mt-1.5 text-[13px] font-medium leading-none text-[#7E3BED]/80";

/** Header ⋮ / pencil icons — purple, no box */
export const APPOINTMENT_POPUP_HEADER_ACTION_CLASS =
  "size-6 shrink-0 rounded-md border-0 bg-transparent p-0 text-[#BC9BF6] shadow-none hover:bg-[#7E3BED]/10 hover:text-[#7E3BED]";

/** Header close — Figma: 44×44, radius 8, padding 10, no fill */
export const APPOINTMENT_POPUP_CLOSE_ACTION_CLASS =
  "size-11 shrink-0 rounded-lg !border-0 !bg-transparent p-2.5 text-[#6B6B6B] !shadow-none hover:!bg-black/5 hover:text-[#000000]";

/** Body: horizontal padding; full-bleed rows use negative margins */
export const APPOINTMENT_POPUP_BODY_INSET_CLASS =
  "space-y-0 px-5 py-0 scrollbar-thin";

export const APPOINTMENT_POPUP_FOOTER_CLASS =
  "flex-col items-stretch gap-3 border-t border-[#E6E6E6] bg-white px-5 pt-3 pb-5";

export const APPOINTMENT_POPUP_PRIMARY_BUTTON_CLASS =
  "h-12 min-h-12 w-full rounded-lg bg-[#7E3BED] text-[15px] font-bold text-white shadow-none hover:bg-[#7135d5] disabled:opacity-60";

export const APPOINTMENT_POPUP_FIELD_CLASS =
  "h-11 min-h-11 rounded-lg border border-[#D1D1D1] bg-white px-3 text-[14px] shadow-none focus-visible:border-[#7E3BED] focus-visible:ring-2 focus-visible:ring-[#7E3BED]/20 data-[size=default]:h-11 data-[size=sm]:h-11";

/**
 * Date/time Subhead — Figma:
 * height hug 52px, border-y 1px primary/300 (#BC9BF6), white fill,
 * cells pad spacing/4 (y) · spacing/6 (x), gap 10, inline “On … / At …”.
 */
export const APPOINTMENT_POPUP_DATETIME_ROW_CLASS =
  "flex h-[52px] w-full items-stretch gap-[10px] border-y border-x-0 border-solid border-[#BC9BF6] bg-white";

export const APPOINTMENT_POPUP_DATETIME_CELL_CLASS =
  "flex h-full min-w-0 flex-1 items-center px-[var(--spacing-6)] py-[var(--spacing-4)] text-left";

/** Status row — padded; not full-bleed */
export const APPOINTMENT_POPUP_STATUS_ROW_CLASS =
  "flex w-full items-center justify-between gap-3 px-0 py-3";

export const APPOINTMENT_POPUP_SECTION_BORDER_CLASS =
  "border-t border-[#BC9BF6]";

export const APPOINTMENT_POPUP_CLIENT_CARD_CLASS =
  "mx-0 rounded-xl bg-[#F6F1FE] px-4 py-4";

export const APPOINTMENT_POPUP_PLUS_BUTTON_CLASS =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[#7E3BED] text-white hover:bg-[#7135d5]";

/** CHECK-IN / status CTA — Figma pill */
export const APPOINTMENT_POPUP_STATUS_CTA_CLASS =
  "h-8 rounded-lg border border-black bg-white px-3.5 text-[11px] font-bold uppercase tracking-[0.04em] text-black shadow-none hover:bg-[#F6F1FE]";
