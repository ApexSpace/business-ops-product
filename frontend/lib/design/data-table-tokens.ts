/**

 * PandaCue Figma “Sales Table” — universal list table + toolbar tokens.

 * Used by DataTable, ListToolbar, SearchInput, and entity workspaces.

 * Typography inherits global Montserrat (--font-sans).

 */



/** primary/200 — header fill / table border · hsba(262, 22%, 98%) */

export const DATA_TABLE_HEADER_BG = "#F3F0F9";



/** primary/300 — row separators · hsba(262, 37%, 96%) */

export const DATA_TABLE_ROW_BORDER = "#BC9BF6";



/** border/subtle — search field outline · hsba(0, 0%, 89%) */

export const DATA_TABLE_SEARCH_BORDER = "#E3E3E3";



/**

 * primary/800 — column header text · Figma hsba(263, 81%, 53%)

 * Matches `--pc-violet-primary-dark` / `#5F2CB2`

 */

export const DATA_TABLE_HEADER_TEXT = "#5F2CB2";



/** primary/500 — CTA / status accent */

export const DATA_TABLE_ACCENT = "#7E3BED";



/** Primary CTA fill (New Checkout, New Gift Card, …) */

export const DATA_TABLE_PRIMARY_CTA = "#7E3BED";



/** neutral/700 — body cell text · hsba(0, 0%, 29%) */

export const DATA_TABLE_CELL_TEXT = "#4A4A4A";



/** Figma row height */

export const DATA_TABLE_ROW_HEIGHT_PX = 80;



/** Figma header row height */

export const DATA_TABLE_HEADER_HEIGHT_PX = 59;



/**

 * Outer table shell — Figma Sales Table:

 * 1px primary/200 border, radius/md, white fill.

 * Flex column so the body scrolls under a sticky header.

 */

export const DATA_TABLE_SHELL_CLASS =

  "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[#F3F0F9] bg-white shadow-none";



/**

 * Sticky header — sticks within the DataTable scroll host.

 * Opaque th backgrounds so rows don’t show through while scrolling.

 */

export const DATA_TABLE_HEADER_CLASS =

  "sticky top-0 z-20 bg-[#F3F0F9] [&_tr]:border-b-0 [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-[#F3F0F9]";



/** Header cell typography — primary/800, 14px bold (Montserrat) */

export const DATA_TABLE_HEAD_CELL_CLASS =

  "h-[59px] px-4 text-left align-middle text-[14px] font-bold leading-none tracking-normal text-[#5F2CB2] whitespace-nowrap";



/** Body row — 80px, 2px primary/300 bottom border only */

export const DATA_TABLE_ROW_CLASS =

  "h-20 border-b-2 border-[#BC9BF6] bg-white transition-colors hover:bg-[#F6F1FE]/60 data-[state=selected]:bg-[#F6F1FE]";



/** Body cell — Figma pad 8 / 16 · neutral/700 */

export const DATA_TABLE_CELL_CLASS =

  "px-4 py-2 align-middle text-[14px] font-normal leading-[21px] text-[#4A4A4A] whitespace-nowrap";



/**

 * List toolbar — Figma: primary CTA left, search + standalone filter right, h 44.

 */

export const DATA_TABLE_TOOLBAR_CLASS =

  "flex min-h-11 w-full flex-row flex-wrap items-center gap-3 border-0 bg-transparent p-0 shadow-none sm:gap-8";



/** Primary “New …” CTA — Figma h 44, radius/md */

export const DATA_TABLE_PRIMARY_ACTION_CLASS =

  "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-0 bg-[#7E3BED] px-4 text-[14px] font-bold leading-4 text-white shadow-none hover:bg-[#7135D5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/40";



/** Standalone search field */

export const DATA_TABLE_SEARCH_STANDALONE_CLASS =

  "h-11 w-full min-w-0 max-w-[min(100%,355px)] rounded-[var(--radius-md)] border border-[#E3E3E3] bg-white px-4 py-2 text-[14px] shadow-none placeholder:text-grey-tertiary-normal focus-visible:border-[#7E3BED] focus-visible:ring-2 focus-visible:ring-[#7E3BED]/20";



/** Alias used by older imports */

export const DATA_TABLE_SEARCH_CLASS = DATA_TABLE_SEARCH_STANDALONE_CLASS;



/**

 * Filter icon — standalone black symbol with gap from search

 * (same pattern as Appointments calendar toolbar).

 */

export const DATA_TABLE_FILTER_ICON_CLASS =

  "inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] !border-0 !bg-transparent p-0 text-black shadow-none hover:!bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/30";



/** Status cell text — purple accent (not a badge pill) */

export const DATA_TABLE_STATUS_CLASS =

  "text-[14px] font-semibold text-[#7E3BED]";


