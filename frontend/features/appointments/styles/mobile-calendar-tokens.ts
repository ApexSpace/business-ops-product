/**
 * Figma Calendar-mobile tokens (New Appointment calendar — phone).
 * Prefer these on <md; desktop calendar-figma tokens stay unchanged.
 */

/** Purple app bar — locked brand violet (not client --primary). */
export const MOBILE_CAL_HEADER_BG = "bg-violet-primary-normal";

/** @deprecated Use `MOBILE_TOP_BAR_CLASS` from `@/lib/design/mobile-list-tokens`. */
export { MOBILE_TOP_BAR_CLASS as MOBILE_CAL_HEADER_CLASS } from "@/lib/design/mobile-list-tokens";

/** Date strip selected pill — primary/900-ish indigo */
export const MOBILE_CAL_DATE_SELECTED_BG = "bg-[#2F1261]";

/** Week-view day column width (fixed grid). Staff day view uses fluid `1fr` columns on mobile. */
export const MOBILE_CAL_COL_WIDTH_PX = 116;

/** Time gutter — narrower than desktop 80px for phone density */
export const MOBILE_CAL_TIME_GUTTER_PX = 52;

/** Staff header — avatar above name */
export const MOBILE_CAL_STAFF_HEADER_HEIGHT_PX = 56;

/** Bottom nav — Figma 60px hug + safe area */
export const MOBILE_CAL_BOTTOM_NAV_HEIGHT_PX = 60;

/** Appointment card (Mobile-Small) — Figma radius ~3, pad 5, gap 4 */
export const MOBILE_CAL_CARD_RADIUS_CLASS = "rounded-[3px]";
export const MOBILE_CAL_CARD_PAD_CLASS = "gap-1 p-[5px]";

/** Visible mid-week columns on mobile week view (Mon–Wed) */
export const MOBILE_CAL_WEEK_VISIBLE_DAYS = 3;
