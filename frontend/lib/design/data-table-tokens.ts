/**
 * Design-token ownership
 * - Visual values: frontend/app/globals.css and frontend/lib/theme/*
 * - This file: list table / toolbar / pagination recipes only
 * - Features must not introduce new raw color / radius / height values
 *
 * PandaCue Figma “Sales Table” — used by DataTable, ListToolbar, SearchInput,
 * ListPagination, and entity workspaces. Colors reference CSS variables.
 */

/**
 * primary/800 — column header text
 * Matches `--pc-violet-primary-dark`
 */
export const DATA_TABLE_HEADER_TEXT = "var(--pc-violet-primary-dark)";

/**
 * Outer table shell — Figma Sales Table:
 * 1px primary/200 border, radius/md, white fill.
 * Content-height: do not use `h-0 flex-1` (stretches empty space under
 * the last row) or `h-full` on `<table>` (browsers distribute extra
 * height across rows). `max-h-full` still allows long lists to scroll.
 */
export const DATA_TABLE_SHELL_CLASS =
  "flex w-full min-h-0 max-h-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--drawer-tab-track)] bg-white shadow-none";

/** Scroll host for the grid — content-sized; scrolls when rows exceed the shell. */
export const DATA_TABLE_SCROLL_CLASS = "min-h-0 overflow-auto";

/**
 * Grid width only. Height stays content-sized so `--table-row-height` is honored.
 */
export const DATA_TABLE_GRID_CLASS = "w-full";

/** Empty-state filler when there are no rows — intrinsic height, not stretched. */
export const DATA_TABLE_EMPTY_FILL_CLASS = "flex items-center justify-center";

/**
 * Sticky header — sticks within the DataTable scroll host.
 * Opaque th backgrounds so rows don’t show through while scrolling.
 */
export const DATA_TABLE_HEADER_CLASS =
  "sticky top-0 z-20 bg-[var(--drawer-tab-track)] [&_tr]:border-b-0 [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-[var(--drawer-tab-track)]";

/** Header cell typography — primary/800, 14px bold (Montserrat) */
export const DATA_TABLE_HEAD_CELL_CLASS =
  "h-[var(--table-row-height)] px-4 text-left align-middle text-[14px] font-bold leading-none tracking-normal text-violet-primary-dark whitespace-nowrap";

/** Sticky header row — same `--table-row-height` as body rows */
export const DATA_TABLE_HEADER_ROW_CLASS =
  "h-[var(--table-row-height)] border-b-0 bg-[var(--drawer-tab-track)] hover:bg-[var(--drawer-tab-track)] data-[state=selected]:bg-[var(--drawer-tab-track)]";

/** Body row — `--table-row-height` (56px), 2px primary/300 bottom border only */
export const DATA_TABLE_ROW_CLASS =
  "h-[var(--table-row-height)] border-b-2 border-[var(--drawer-divider-accent)] bg-white transition-colors hover:bg-violet-primary-surface/60 data-[state=selected]:bg-violet-primary-surface";

/** Body cell — Figma pad 8 / 16 · neutral/700 · row token height */
export const DATA_TABLE_CELL_CLASS =
  "h-[var(--table-row-height)] px-4 py-2 align-middle text-[14px] font-normal leading-[21px] text-[var(--drawer-text-body)] whitespace-nowrap";

/**
 * List toolbar — Figma: primary CTA left, search + standalone filter right, h 44.
 */
export const DATA_TABLE_TOOLBAR_CLASS =
  "flex min-h-[var(--control-height)] w-full flex-row flex-wrap items-center gap-3 border-0 bg-transparent p-0 shadow-none sm:gap-8";

/**
 * Primary “New …” CTA layout extras — fill/hover come from Button `variant="brand"`.
 * Height uses `--control-height` via Button size default.
 */
export const DATA_TABLE_PRIMARY_ACTION_CLASS =
  "min-w-[157px] gap-2 rounded-[var(--radius-sm)] px-4";

/** Standalone search field — Figma h 44, max ~355, radius/md */
export const DATA_TABLE_SEARCH_STANDALONE_CLASS =
  "h-[var(--control-height)] w-full min-w-0 max-w-[min(100%,355px)] rounded-[var(--radius-md)] border border-[var(--pc-black-secondary-light)] bg-white px-4 py-2 text-[14px] shadow-none placeholder:text-grey-tertiary-normal focus-visible:border-violet-primary-normal focus-visible:ring-2 focus-visible:ring-violet-primary-normal/20";

/**
 * Filter-with Icon — Figma: 56×44, radius/md, 1px border/subtle, white fill.
 * Sits beside search with a clear gap (not joined into one control).
 * Important width/height beat Button `size="icon"` square sizing.
 */
export const DATA_TABLE_FILTER_ICON_CLASS =
  "inline-flex !h-[var(--control-height)] !w-14 !min-h-[var(--control-height)] !min-w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--pc-black-secondary-light)] bg-white p-0 text-foreground shadow-none hover:bg-violet-primary-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30";

/** Status cell text — purple accent (not a badge pill) */
export const DATA_TABLE_STATUS_CLASS =
  "text-[14px] font-bold leading-none text-violet-primary-normal";

/** Sale number cell — Figma Spline/body bold 14 · neutral/700 */
export const DATA_TABLE_SALE_NUMBER_CLASS =
  "text-[14px] font-bold leading-[21px] text-[var(--drawer-text-body)]";

/**
 * Numbered pagination row — Figma Contacts/Sales footer:
 * centered, gap 8, Previous/Next + circular page pills (active = primary/500).
 * Default size uses --control-height (≥44px); dense lists can override.
 */
export const DATA_TABLE_PAGINATION_CLASS =
  "flex w-full flex-wrap items-center justify-center gap-2";

export const DATA_TABLE_PAGINATION_BTN_CLASS =
  "inline-flex h-[var(--control-height)] min-h-[var(--control-height)] min-w-[var(--control-height)] shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full border-0 bg-transparent px-2 text-[14px] font-medium text-[var(--drawer-text-body)] shadow-none transition-colors duration-150 hover:bg-[var(--drawer-tab-track)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30 disabled:pointer-events-none disabled:opacity-40";

export const DATA_TABLE_PAGINATION_PAGE_CLASS =
  "inline-flex size-[var(--control-height)] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[14px] font-medium text-[var(--drawer-text-body)] shadow-none transition-colors duration-150 hover:bg-[var(--drawer-tab-track)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30";

export const DATA_TABLE_PAGINATION_PAGE_ACTIVE_CLASS =
  "inline-flex size-[var(--control-height)] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-violet-primary-normal text-[14px] font-bold text-white shadow-none transition-colors duration-150 hover:bg-violet-primary-normal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/40";

/** Figma pagination chevron ~9.33px */
export const DATA_TABLE_PAGINATION_ICON_CLASS = "size-2.5 shrink-0";
