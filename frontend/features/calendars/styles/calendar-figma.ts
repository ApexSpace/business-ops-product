/**
 * PandaCue Figma Calendar Table tokens (Appointment / Calendar tab).
 *
 * primary/500  hsba(263, 75%, 93%, 1)  → #7E3BED
 * border soft  hsba(263, 75%, 93%, 0.6) → rgba(126, 59, 237, 0.6)
 * slot line    hsba(262, 37%, 96%, 1)   → #BC9BF6
 * surface      #F6F1FE
 */

export const CALENDAR_FIGMA_PRIMARY = "#7E3BED";
export const CALENDAR_FIGMA_PRIMARY_SOFT = "rgba(126, 59, 237, 0.6)";
export const CALENDAR_FIGMA_BORDER = "#BC9BF6";
export const CALENDAR_FIGMA_SURFACE = "#F6F1FE";
export const CALENDAR_FIGMA_CELL_BG = "#FFFFFF";

/** Time column — Figma fixed 80px */
export const CALENDAR_FIGMA_TIME_GUTTER_PX = 80;

/** Staff header row — Figma 64px */
export const CALENDAR_FIGMA_STAFF_HEADER_HEIGHT_PX = 64;

/** Hour row height — Figma 120px (4 × 15-min slots) */
export const CALENDAR_FIGMA_HOUR_HEIGHT_PX = 120;

/** 15-minute slot — Figma 30px */
export const CALENDAR_FIGMA_SLOT_HEIGHT_PX = 30;

/** Toolbar controls — Figma 44px */
export const CALENDAR_FIGMA_TOOLBAR_HEIGHT_PX = 44;

/** Filter icon button — Figma hug 56 × 44 */
export const CALENDAR_FIGMA_FILTER_WIDTH_PX = 56;

/** Day/Week segment — Figma ~65 × 44, group gap 21px */
export const CALENDAR_FIGMA_VIEW_SEGMENT_MIN_PX = 65;
export const CALENDAR_FIGMA_VIEW_GROUP_GAP_PX = 21;

/**
 * Staff column — Figma fill ~320px; min keeps Day-view scroll usable when many
 * staff tracks are shown. Week view uses the shared `fluid` grid recipe instead
 * (`minmax(0, 1fr)`) so 7 days share leftover width without a forced min-width.
 */
export const CALENDAR_FIGMA_STAFF_COL_MIN_PX = 240;
export const CALENDAR_FIGMA_STAFF_COL_IDEAL_PX = 320;

/** Date frame — Figma gap 11px between chevron and label cluster */
export const CALENDAR_FIGMA_DATE_GAP_PX = 11;
