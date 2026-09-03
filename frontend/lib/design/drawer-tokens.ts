/**
 * Design-token ownership
 * - Visual values: frontend/app/globals.css and frontend/lib/theme/*
 * - This file: drawer recipes and layout contracts only (Figma spine + fields)
 * - Features must not introduce new raw color / radius / height values
 *
 * Tailwind class compositions reference CSS variables (--drawer-*, --pc-violet-*).
 * Not a second brand-token system.
 *
 * Density hit-and-trial (edit in frontend/app/globals.css :root):
 *   --drawer-section-gap        → gap-drawer-section     (major sections)
 *   --drawer-stack-gap          → gap-drawer-stack       (field-to-field)
 *   --drawer-field-gap          → gap-drawer-field       (label → control)
 *   --drawer-header-padding-y   → py-drawer-header-y
 *   --drawer-header-icon-size   → header close/edit/trash/more hover box
 *   --drawer-header-gap         → gap-drawer-title       (eyebrow → title)
 *   --drawer-body-padding-y     → py-drawer-body-y / pt-drawer-body-y
 *   --drawer-body-padding-bottom → pb-drawer-body-bottom (last field → footer)
 *   --drawer-footer-padding-y   → py-drawer-footer-y
 *   --drawer-footer-gap         → gap-drawer-footer
 *   --plus-button-inset         → field-trailing “+” top/bottom/right
 *   --drawer-express-row-height → express / toggle row
 *   --drawer-spine-width        → w-[var(--drawer-spine-width)]
 *   --drawer-spine-padding-x    → px-drawer-spine-x
 *   --drawer-spine-padding-y    → py-drawer-spine-y
 *   --mobile-top-bar-height       → mobile list/calendar/drawer purple headers
 */

import {
  MOBILE_LIST_HEADER_BG,
  MOBILE_TOP_BAR_SHELL_CLASS,
} from "@/lib/design/mobile-list-tokens";

import { cn } from "@/lib/utils";
import {
  FIELD_TRIGGER_CHEVRON_DRAWER_SLOT_CLASS,
} from "@/lib/ui/control-styles";


/* ─── Width tiers (single map for DrawerShell, FormSheet, EntityDetailDrawer) ───
 * narrow  ~409–480 · medium ~600 · wide 640 · split/conversation ~900–1120
 */

/** Narrow entity/form sheet. */
export const DRAWER_SHELL_WIDTH_COMPACT =
  "[--sheet-width:min(94vw,480px)]";

/** Medium form / detail sheet. */
export const DRAWER_SHELL_WIDTH_STANDARD =
  "[--sheet-width:min(94vw,600px)]";

/** Wide form / financial sheet. */
export const DRAWER_SHELL_WIDTH_WIDE = "[--sheet-width:min(94vw,640px)]";

export const DRAWER_SHELL_WIDTH_CONVERSATION =
  "[--sheet-width:min(70vw,900px)]";

/** Two-column profile / waitlist. */
export const DRAWER_SHELL_WIDTH_SPLIT =
  "[--sheet-width:min(96vw,var(--drawer-width-split))]";

/** Figma appointment / checkout / options column. */
export const DRAWER_SHELL_WIDTH_APPOINTMENT =
  "[--sheet-width:clamp(280px,min(94vw,100dvw),409px)]";

export const DRAWER_SHELL_WIDTH_APPOINTMENT_MOBILE =
  "[--sheet-width:100dvw]";

export type DrawerShellWidthTier =
  | "compact"
  | "standard"
  | "wide"
  | "conversation"
  | "split"
  | "appointment"
  | "appointment-mobile";

export function drawerShellWidthClass(
  width: DrawerShellWidthTier = "standard",
): string {
  switch (width) {
    case "compact":
      return DRAWER_SHELL_WIDTH_COMPACT;
    case "appointment":
      return DRAWER_SHELL_WIDTH_APPOINTMENT;
    case "appointment-mobile":
      return DRAWER_SHELL_WIDTH_APPOINTMENT_MOBILE;
    case "wide":
      return DRAWER_SHELL_WIDTH_WIDE;
    case "conversation":
      return DRAWER_SHELL_WIDTH_CONVERSATION;
    case "split":
      return DRAWER_SHELL_WIDTH_SPLIT;
    default:
      return DRAWER_SHELL_WIDTH_STANDARD;
  }
}

/**
 * @deprecated Migration-only 34×34 bordered header control.
 * Prefer DRAWER_CLOSE_ACTION_CLASS / DRAWER_HEADER_ACTION_CLASS.
 */
export const DRAWER_SHELL_HEADER_ACTION_CLASS =
  "size-[34px] shrink-0 rounded-[9px] border border-border bg-background text-muted-foreground shadow-none hover:bg-muted/40 hover:text-foreground";

/** Title left + actions/close right — vertically centered as a group. */
export const DRAWER_SHELL_HEADER_ROW_CLASS =
  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1";

/** Header actions + close cluster — center with the title block. */
export const DRAWER_SHELL_HEADER_ACTIONS_CLASS =
  "flex shrink-0 items-center gap-1.5 self-center";

export const DRAWER_SHELL_TITLE_CLASS =
  "text-[21px] font-semibold tracking-tight";

export const DRAWER_SHELL_DESCRIPTION_CLASS =
  "mt-1 text-[13px] leading-relaxed text-muted-foreground";

export const DRAWER_SHELL_BODY_CLASS = "min-h-0 flex-1 overflow-y-auto !p-0";

export const DRAWER_SHELL_CONTENT_INSET_CLASS =
  "space-y-0 px-6 pt-drawer-body-y pb-drawer-body-bottom scrollbar-thin";

export const DRAWER_SHELL_FOOTER_CLASS =
  "flex-row flex-wrap items-center justify-end gap-2.5 border-t border-border/70 bg-background px-7 py-drawer-footer-y";

/** Dense form-control recipe used by FormSheet drawers (maps to CSS vars / ring tokens).
 * Figma field radius is 10px — no exact global token; keep pixel value. */
export const DRAWER_FIELD_CONTROL_CLASS =
  "h-[var(--control-height)] min-h-[var(--control-height)] data-[size=default]:h-[var(--control-height)] data-[size=sm]:h-[var(--control-height)] rounded-[10px] border-[1.5px] text-[13.5px] shadow-none focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15";

/** Label recipe for FormSheet drawers (distinct from Figma DRAWER_FIELD_LABEL_CLASS). */
export const DRAWER_FIELD_LABEL_SHELL_CLASS =
  "flex items-center gap-1 text-[12.5px] font-semibold text-muted-foreground";

export const DRAWER_FORM_FIELD_CLASS = "flex flex-col gap-drawer-field";

export const DRAWER_FORM_ITEM_CLASS = "mb-drawer-stack gap-drawer-field";

export const DRAWER_FORM_DIVIDER_CLASS = "my-drawer-section h-px bg-border/60";

export const DRAWER_FORM_STACK_CLASS = "space-y-drawer-stack";

export const DRAWER_COMPACT_CONTENT_CLASS = "px-drawer-body-x";

export const DRAWER_COMPACT_FOOTER_CLASS = "px-drawer-body-x pt-drawer-footer-y pb-0";

export const DRAWER_SCROLL_EDGE_CLASS =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin -mr-4";

export const DRAWER_SCROLL_CONTENT_INSET_CLASS = "pr-4";

/** Purple purpose strip — width/pad from `--drawer-spine-*` (globals.css). */
export const DRAWER_SPINE_CLASS =
  "flex w-[var(--drawer-spine-width)] shrink-0 flex-col items-center justify-center self-stretch rounded-l-[12px] bg-violet-primary-normal px-drawer-spine-x py-drawer-spine-y";

export const DRAWER_SPINE_LABEL_CLASS =
  "pointer-events-none select-none text-[length:var(--drawer-spine-font-size)] font-bold uppercase leading-none tracking-[var(--drawer-spine-tracking)] text-white";

/** Full-width drawer footer layout — height/padding from Button size="default". */
export const DRAWER_PRIMARY_FOOTER_BUTTON_CLASS = "w-full";


/* ─── Default Figma spine drawer chrome ─── */


/** Figma primary/500 — locked PandaCue violet, not client `--primary`. */
export const DRAWER_BRAND_BG = "bg-violet-primary-normal";
export const DRAWER_BRAND_BG_HOVER = "hover:bg-violet-primary-normal-hover";
export const DRAWER_BRAND_TEXT = "text-violet-primary-normal";
export const DRAWER_BRAND_TEXT_DARK = "text-violet-primary-dark";
export const DRAWER_BRAND_BORDER = "border-violet-primary-normal";
export const DRAWER_BRAND_RING =
  "focus-visible:border-violet-primary-normal focus-visible:ring-violet-primary-normal/20";

/** Warm neutrals from Figma (not in global semantic theme). */
export const DRAWER_FIELD_BORDER = "var(--drawer-field-border)";
export const DRAWER_DIVIDER = "var(--drawer-divider)";
export const DRAWER_HEADER_BORDER = "var(--drawer-header-border)";
export const DRAWER_TAB_TRACK = "var(--drawer-tab-track)";
export const DRAWER_TAB_TRACK_BORDER = "var(--drawer-tab-track-border)";
export const DRAWER_CONFIRMED_BG = "var(--drawer-confirmed-bg)";
export const DRAWER_CONFIRMED_FG = "var(--drawer-confirmed-fg)";
export const DRAWER_DIVIDER_ACCENT = "var(--drawer-divider-accent)";

export const DRAWER_ICON_MUTED = "var(--drawer-icon-muted)";
export const DRAWER_ICON_GEAR = "var(--drawer-icon-gear)";
export const DRAWER_ICON_CHEVRON = "#000000";
export const DRAWER_AVATAR_BG = "var(--drawer-avatar-bg)";
export const DRAWER_AVATAR_FG = "var(--drawer-avatar-fg)";

/** Shadow on the combined spine + content panel — Figma: 0 8 24 @ 5% opacity. */
export const DRAWER_PANEL_SHADOW_CLASS =
  "shadow-[0_8px_24px_rgba(44,27,21,0.05)]";

/** SheetContent overrides when spine is present — no glass/white behind purple strip. */
export const DRAWER_SHEET_CONTENT_CLASS =
  "h-dvh max-h-dvh overflow-visible border-0 !bg-transparent shadow-none backdrop-blur-none [background-image:none]";


/** Applied to the spine + content flex row (shadow only — no background fill). */
export const DRAWER_SHELL_CLASS = cn(
  DRAWER_PANEL_SHADOW_CLASS,
  "overflow-hidden",
);

/** White form column — sits to the right of the purple spine only. */
export const DRAWER_CONTENT_PANEL_CLASS =
  "flex min-w-0 w-full flex-col bg-white";

/** Header — vertical pad `--drawer-header-padding-y`; close is centered in this bar. */
export const DRAWER_HEADER_CLASS =
  "relative flex shrink-0 flex-col justify-center border-x-0 border-t-0 border-b border-solid border-[var(--drawer-header-border)] !bg-white px-4 py-drawer-header-y [background-image:none] sm:px-6";

/** Hover box for header icons — value lives on `--drawer-header-icon-size`. */
export const DRAWER_HEADER_ICON_BOX_CLASS =
  "!size-[var(--drawer-header-icon-size)] !min-h-[var(--drawer-header-icon-size)] !min-w-[var(--drawer-header-icon-size)]";

/**
 * Canonical drawer/sheet header icon control — close (X) is the standard.
 * Size comes from `--drawer-header-icon-size` (globals.css). Important min
 * beats IconButton `size="icon"` (`--control-height`).
 */
export const DRAWER_HEADER_ACTION_CLASS = cn(
  "relative shrink-0 cursor-pointer self-center rounded-md !border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-violet-primary-normal/10 hover:text-violet-primary-normal [&>svg]:size-4",
  DRAWER_HEADER_ICON_BOX_CLASS,
);

/** Identical to header actions — close is not a special size. */
export const DRAWER_CLOSE_ACTION_CLASS = DRAWER_HEADER_ACTION_CLASS;

/**
 * Force every IconButton in the drawer header (edit, trash, more, close)
 * to the close (X) hover box. Text buttons in `headerActions` are untouched.
 */
export const DRAWER_HEADER_ICON_BUTTON_SLOT_CLASS = cn(
  "[&_[data-icon-button]]:relative [&_[data-icon-button]]:self-center [&_[data-icon-button]]:rounded-md [&_[data-icon-button]]:!border-0 [&_[data-icon-button]]:bg-transparent [&_[data-icon-button]]:p-0 [&_[data-icon-button]]:text-muted-foreground [&_[data-icon-button]]:!shadow-none [&_[data-icon-button]]:hover:bg-violet-primary-normal/10 [&_[data-icon-button]]:hover:text-violet-primary-normal [&_[data-icon-button]_svg]:size-4",
  "[&_[data-icon-button]]:!size-[var(--drawer-header-icon-size)] [&_[data-icon-button]]:!min-h-[var(--drawer-header-icon-size)] [&_[data-icon-button]]:!min-w-[var(--drawer-header-icon-size)]",
);

/** @deprecated Use `DRAWER_HEADER_ICON_BUTTON_SLOT_CLASS`. */
export const DRAWER_HEADER_CLOSE_OVERRIDES =
  DRAWER_HEADER_ICON_BUTTON_SLOT_CLASS;

export const DRAWER_TITLE_SLOT_OVERRIDES =
  "[&_[data-slot=sheet-title]]:block [&_[data-slot=sheet-title]]:text-[20px] [&_[data-slot=sheet-title]]:font-bold [&_[data-slot=sheet-title]]:leading-none [&_[data-slot=sheet-title]]:text-violet-primary-normal";

export const DRAWER_SHELL_HEADER_CLASS = cn(
  DRAWER_HEADER_CLASS,
  DRAWER_TITLE_SLOT_OVERRIDES,
  DRAWER_HEADER_CLOSE_OVERRIDES,
);

/** Header title block — eyebrow + title; gap `--drawer-header-gap`. */
export const DRAWER_HEADER_CONTENT_CLASS =
  "flex min-w-0 flex-col justify-center gap-drawer-title";

/** Figma eyebrow — Montserrat 700 · 12px · neutral/500 · uppercase. */
export const DRAWER_DATE_EYEBROW_CLASS =
  "text-[12px] font-bold uppercase leading-none tracking-normal text-[var(--drawer-text-secondary)]";

/** Figma title — Montserrat 700 · 20px · primary/500 · line-height 100%. */
export const DRAWER_TITLE_CLASS =
  "text-[20px] font-bold leading-none tracking-normal text-violet-primary-normal";

export const DRAWER_DESCRIPTION_CLASS =
  "mt-1.5 text-[13px] font-medium leading-none text-violet-primary-normal/80";

/** Shared sheet/drawer header: title row + optional description below. */
export const SHEET_HEADER_CLASS =
  "flex shrink-0 flex-col justify-center gap-1 border-b border-border px-4 py-drawer-header-y";

export const SHEET_HEADER_ROW_CLASS =
  "flex min-h-[var(--control-height-sm)] w-full items-center justify-between gap-3 [&_[data-slot=sheet-close]]:self-center";

export const DRAWER_BODY_INSET_CLASS =
  "flex w-full min-w-0 flex-col gap-drawer-section px-4 pt-drawer-body-y pb-drawer-body-bottom scrollbar-thin sm:px-6";

/** Form field stack — section-to-section gap `--drawer-section-gap`. */
export const DRAWER_FORM_FIELDS_CLASS =
  "@container/drawer-form flex w-full min-w-0 flex-col gap-drawer-section";

/** Field group — label → control gap `--drawer-field-gap`. */
export const DRAWER_FIELD_GROUP_CLASS =
  "flex w-full min-w-0 flex-col gap-drawer-field";

/**
 * Stacked field (Duration / Staff / Reason) —
 * fill width · label/control gap `--drawer-field-gap` · pb 6px.
 */
export const DRAWER_STACKED_FIELD_GROUP_CLASS =
  "flex w-full min-w-0 flex-col gap-drawer-field pb-1.5";

/**
 * Figma Time Block Detail stacked rows —
 * label 14px/500 hsba(344, 18%, 32%) · value Body Small 500 14px · var(--drawer-text-secondary).
 */
export const DRAWER_VIEW_FIELD_LABEL_CLASS =
  "block text-[14px] font-medium leading-none text-[var(--drawer-text-label)]";

export const DRAWER_VIEW_FIELD_VALUE_CLASS =
  "block min-w-0 truncate text-[14px] font-medium leading-none text-[var(--drawer-text-secondary)]";

/** Footer — pad `--drawer-footer-padding-y` · stack `--drawer-footer-gap`. */
export const DRAWER_FOOTER_CLASS = cn(
  "flex w-full min-w-0 shrink-0 flex-col items-stretch justify-start gap-drawer-footer",
  "border-t border-[var(--drawer-header-border)] bg-white px-4 pt-drawer-footer-y sm:px-6",
  "pb-[max(var(--drawer-footer-padding-y),env(safe-area-inset-bottom,0px))] sm:pb-[max(var(--drawer-footer-padding-y),env(safe-area-inset-bottom,0px))]",
  "sm:!flex-col !items-stretch !justify-start !gap-[var(--drawer-footer-gap)]",
  "!border-[var(--drawer-header-border)] !bg-white !px-4 sm:!px-6",
);

export const DRAWER_FOOTER_INNER_CLASS =
  "flex w-full min-w-0 flex-col gap-drawer-footer";

/** Figma Express Booking row — height `--drawer-express-row-height`. */
export const DRAWER_EXPRESS_ROW_CLASS =
  "flex h-[var(--drawer-express-row-height)] min-h-[var(--drawer-express-row-height)] w-full min-w-0 items-center justify-between gap-3";

/** Figma label — Montserrat 500 · 16px · neutral/700. */
export const DRAWER_EXPRESS_LABEL_CLASS =
  "min-w-0 shrink text-base font-medium leading-none text-[var(--drawer-text-body)]";

/** Figma Toggle — 40×17.5 · radius 62.5 · pad 1.25 · neutral/400 off (hit area expanded for touch). */
export const DRAWER_SWITCH_CLASS = cn(
  "relative data-[size=default]:!h-[17.5px] data-[size=default]:!w-10 data-[size=default]:!rounded-full data-[size=default]:!p-[1.25px]",
  "data-checked:bg-violet-primary-normal data-unchecked:bg-[var(--drawer-switch-off)]",
  "[&_[data-slot=switch-thumb]]:!size-3.5 [&_[data-slot=switch-thumb]]:!translate-x-[1.25px]",
  "data-checked:[&_[data-slot=switch-thumb]]:!translate-x-[calc(2.5rem-0.875rem-0.125rem)]",
  "after:absolute after:-inset-y-3 after:-inset-x-2 after:content-['']",
);

export const DRAWER_SETTINGS_ICON_BUTTON_CLASS =
  "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--drawer-icon-gear)] hover:text-violet-primary-normal";

/** Full-width drawer/dialog primary — fill from Button `variant="brand"`.
 * Height/padding come from Button size="default" (`--control-height`, `--control-padding-x`). */
export const DRAWER_PRIMARY_BUTTON_CLASS = "w-full max-w-full";

/** Figma Date/Time inputs — 1px warm field border (var(--drawer-field-border)), radius/sm, hug ~43px. */
export const DRAWER_FIELD_CLASS =
  "h-[var(--control-height)] min-h-[var(--control-height)] w-full max-w-full rounded-[var(--radius-sm)] border border-[var(--drawer-field-border)] bg-white px-3 text-[14px] shadow-none focus-visible:border-violet-primary-normal focus-visible:ring-2 focus-visible:ring-violet-primary-normal/20 data-[size=default]:h-[var(--control-height)] data-[size=sm]:h-[var(--control-height)]";

/** Overrides SelectTrigger glass-control so Time matches Date (Figma field border var(--drawer-field-border)). */
export const DRAWER_SELECT_TRIGGER_CLASS = cn(
  DRAWER_FIELD_CLASS,
  "cursor-pointer",
  "!border-[var(--drawer-field-border)] !bg-white !backdrop-blur-none [background-image:none]",
  "focus-visible:!border-violet-primary-normal focus-visible:!ring-2 focus-visible:!ring-violet-primary-normal/20",
  FIELD_TRIGGER_CHEVRON_DRAWER_SLOT_CLASS,
);

export const DRAWER_SERVICE_PICKER_CLASS =
  "z-50 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--drawer-field-border)] bg-white p-0 shadow-[0_8px_24px_rgba(44,27,21,0.12)] ring-0";

export const DRAWER_SERVICE_PICKER_SEARCH_CLASS =
  "h-9 border-0 bg-transparent px-0 text-[14px] shadow-none focus-visible:ring-0";

export const DRAWER_SERVICE_PICKER_ITEM_CLASS =
  "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left outline-none transition-colors hover:bg-[var(--drawer-picker-hover)] focus-visible:bg-[var(--drawer-picker-hover)]";

export const DRAWER_SERVICE_PICKER_ITEM_NAME_CLASS =
  "min-w-0 truncate text-[14px] font-medium leading-[18px] text-[var(--drawer-text-primary)]";

export const DRAWER_SERVICE_PICKER_ITEM_META_CLASS =
  "shrink-0 text-[13px] font-medium tabular-nums leading-[16px] text-[var(--drawer-text-secondary)]";

export const DRAWER_FIELD_LABEL_CLASS =
  "block text-[12px] font-medium leading-none text-[var(--drawer-text-secondary)]";

/** Segmented control — Figma: h 51 · radius 8 · pad 4 · 1px track border. */
export const DRAWER_TYPE_TABS_CLASS =
  "!grid !h-[51px] !w-full !min-h-[51px] grid-cols-2 gap-0 overflow-hidden !rounded-[var(--radius-md)] border border-[rgba(232,228,220,0.5)] !bg-[var(--drawer-tab-track)] !p-1";

export const DRAWER_TYPE_TAB_ACTIVE_CLASS =
  "!h-full cursor-pointer !rounded-[6px] !border-0 !bg-violet-primary-normal !text-[14px] !font-semibold !text-white !shadow-[0_1px_2px_rgba(0,0,0,0.05)] data-active:!bg-violet-primary-normal data-active:!text-white data-active:!shadow-[0_1px_2px_rgba(0,0,0,0.05)] after:!opacity-0";

export const DRAWER_TYPE_TAB_INACTIVE_CLASS =
  "!h-full cursor-pointer !rounded-[6px] !border-0 !bg-white !text-[14px] !font-semibold !text-[var(--drawer-tab-inactive-fg)] hover:!bg-white data-active:!bg-white data-active:!text-[var(--drawer-tab-inactive-fg)] after:!opacity-0";

/** Side-by-side Date|Time (16px gap); stack when the drawer form column is narrow. */
export const DRAWER_BOOKING_DATETIME_ROW_CLASS =
  "grid w-full min-w-0 grid-cols-2 gap-4 @max-[280px]/drawer-form:grid-cols-1";

export const DRAWER_BOOKING_DATETIME_CELL_CLASS =
  "flex min-w-0 w-full flex-col gap-drawer-field";

export const DRAWER_STATUS_ROW_CLASS =
  "flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2";

/** Figma status pill — h 32 · radius 9999 · px 12 · py 6 · 12px · uppercase. */
export const DRAWER_STATUS_PILL_CLASS =
  "inline-flex h-8 max-w-full min-w-0 items-center gap-2 rounded-full border px-3 text-[12px] font-normal uppercase leading-none tracking-[0.04em]";

/**
 * Figma Secondary Small (Check In / Confirm):
 * width hug 117px · height 32px fixed · px spacing/3 (12px) · gap 8px ·
 * 1px primary/500 border · radius/sm · 12px bold.
 */
export const DRAWER_STATUS_CTA_CLASS =
  "box-border inline-flex h-[32px] min-h-[32px] max-h-[32px] min-w-[min(100%,117px)] w-auto max-w-full shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border border-violet-primary-normal bg-white px-3 py-0 font-sans text-[12px] font-bold leading-none text-violet-primary-normal shadow-none appearance-none hover:bg-violet-primary-surface disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

export const DRAWER_SECTION_BORDER_CLASS =
  "border-t border-[var(--drawer-divider)]";

export const DRAWER_CLIENT_CARD_CLASS =
  "mx-0 flex flex-col gap-4 border-0 bg-transparent p-0 shadow-none";

export const DRAWER_CLIENT_AVATAR_CLASS =
  "size-12 shrink-0 rounded-full";

export const DRAWER_CLIENT_AVATAR_FALLBACK_CLASS =
  "bg-[var(--drawer-client-avatar-bg)] text-[18px] font-normal leading-none text-[var(--drawer-client-avatar-fg)]";

/** Avoid leading-none on truncate — clips descenders (g, y, p). */
export const DRAWER_CLIENT_NAME_CLASS =
  "truncate text-[18px] font-bold leading-[22px] text-violet-primary-darker";

/** Figma client since — 12px / 500 / neutral/500. */
export const DRAWER_CLIENT_SINCE_CLASS =
  "truncate text-[12px] font-medium leading-[15px] text-[var(--drawer-text-secondary)]";

/** Figma phone/email row — 13px / 500 / neutral/900 · icon neutral/500 · gap 8px. */
export const DRAWER_CLIENT_CONTACT_ROW_CLASS =
  "flex min-w-0 cursor-pointer items-center gap-2 text-[13px] font-medium leading-[16px] text-[var(--drawer-text-primary)] hover:underline";

/**
 * Add credit card — matches phone/email row density (`DRAWER_CLIENT_CONTACT_ROW_CLASS`).
 * Hit-and-trial: `--drawer-client-credit-card-*` in globals.css.
 */
export const DRAWER_CLIENT_CREDIT_CARD_CLASS =
  "inline-flex min-w-0 cursor-pointer items-center gap-2 text-[length:var(--drawer-client-credit-card-size)] leading-[var(--drawer-client-credit-card-leading)] text-[var(--drawer-text-primary)] [font-weight:var(--drawer-client-credit-card-weight)] hover:underline";

export const DRAWER_CLIENT_CONTACT_ICON_CLASS =
  "size-4 shrink-0 stroke-[1.75] text-[var(--drawer-action-ink)]";

export const DRAWER_CLIENT_ACTION_ICON_CLASS =
  "size-4 shrink-0 stroke-[1.75] text-[var(--drawer-action-ink)]";

export const DRAWER_CLIENT_CONTACT_LIST_CLASS =
  "flex flex-col gap-2";

export const DRAWER_SERVICE_CARD_CLASS =
  "flex flex-col gap-1 border-0 border-t border-[var(--drawer-header-border)] bg-transparent p-0 pt-drawer-stack shadow-none";

export const DRAWER_SERVICE_TITLE_CLASS =
  "truncate text-[18px] font-bold leading-[22px] text-violet-primary-darker";

export const DRAWER_SERVICE_PRICE_CLASS =
  "mt-1 text-[14px] font-bold tabular-nums leading-[18px] text-violet-primary-darker";

export const DRAWER_SERVICE_META_ROW_CLASS =
  "flex items-center justify-between gap-3 pt-1 text-[var(--drawer-text-meta)]";

export const DRAWER_SERVICE_PROVIDER_CLASS =
  "min-w-0 truncate text-[14px] font-medium leading-[18px] text-[var(--drawer-text-meta)]";

/** Inline provider name — looks like meta text, opens a staff dropdown. */
export const DRAWER_PROVIDER_SELECT_TRIGGER_CLASS =
  "h-auto min-h-0 w-auto max-w-full min-w-0 border-0 bg-transparent p-0 text-[14px] font-medium leading-[18px] text-[var(--drawer-text-meta)] shadow-none !backdrop-blur-none [background-image:none] hover:text-violet-primary-normal hover:underline focus-visible:border-0 focus-visible:ring-0 data-[size=default]:h-auto [&>svg]:size-3.5 [&>svg]:text-[var(--drawer-text-secondary)]";

export const DRAWER_SERVICE_TIME_CLASS =
  "shrink-0 tabular-nums text-[12px] font-normal leading-[15px] text-[var(--drawer-text-meta)]";

export const DRAWER_ADD_ACTION_CLASS =
  "inline-flex min-h-6 cursor-pointer items-center gap-[5px] text-[14px] font-medium leading-[18px] text-violet-primary-darker hover:underline";

export const DRAWER_ADD_ACTION_ICON_CLASS =
  "inline-flex size-[var(--plus-button-size)] shrink-0 items-center justify-center rounded-[4px] border-0 bg-violet-primary-normal p-0 leading-none text-white [&>svg]:block [&>svg]:size-[var(--plus-button-icon-size)]";

export const DRAWER_ADD_ACTION_ICON_PAGE_CLASS =
  "inline-flex size-[var(--plus-button-size-page)] shrink-0 items-center justify-center rounded-[4px] border-0 bg-violet-primary-normal p-0 leading-none text-white [&>svg]:block [&>svg]:size-[var(--plus-button-icon-size-page)]";

export const DRAWER_ICON_BUTTON_CLASS =
  "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-violet-primary-darker hover:bg-black/5 hover:text-violet-primary-darker";

export const DRAWER_META_ROW_CLASS =
  "flex min-w-0 items-center gap-2 text-[13px] font-medium leading-[16px] text-[var(--drawer-text-primary)]";

/** Trailing / inline purple “+” — size `--plus-button-size` (Add Note, Service, Client field). */
export const DRAWER_PLUS_BUTTON_CLASS =
  "pointer-events-auto inline-flex size-[var(--plus-button-size)] shrink-0 cursor-pointer appearance-none items-center justify-center rounded-[4px] border-0 bg-violet-primary-normal p-0 leading-none text-white hover:bg-violet-primary-normal-hover [&>svg]:block [&>svg]:size-[var(--plus-button-icon-size)]";

export const DRAWER_PLUS_BUTTON_PAGE_CLASS =
  "pointer-events-auto inline-flex size-[var(--plus-button-size-page)] shrink-0 cursor-pointer appearance-none items-center justify-center rounded-[4px] border-0 bg-violet-primary-normal p-0 leading-none text-white hover:bg-violet-primary-normal-hover [&>svg]:block [&>svg]:size-[var(--plus-button-icon-size-page)]";

export const DRAWER_LINK_CLASS =
  "inline-flex cursor-pointer items-center gap-3 text-[14px] font-medium leading-none text-violet-primary-darker hover:underline";

export const DRAWER_BOOKING_DETAILS_TRIGGER_CLASS =
  "flex h-[37px] w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-0 text-left text-[14px] font-medium leading-[18px] text-[var(--drawer-text-label)] hover:bg-black/[0.03]";

export const DRAWER_CHECKBOX_ROW_CLASS =
  "flex h-6 w-full min-w-0 cursor-pointer items-center gap-[5px]";

/** Checkbox control — 16×16, primary/500 fill, 12×12 checkmark. */
export const DRAWER_CHECKBOX_CLASS =
  "size-4 shrink-0 rounded-[4px] border-violet-primary-normal data-[checked]:border-violet-primary-normal data-[checked]:bg-violet-primary-normal [&_[data-slot=checkbox-indicator]_svg]:size-3";

/** Figma checkbox label — Body Small 500 · 14px · primary/900. */
export const DRAWER_CHECKBOX_LABEL_CLASS =
  "cursor-pointer text-[14px] font-medium leading-none text-violet-primary-darker";

export const DRAWER_MOBILE_CLOSE_ACTION_CLASS =
  "relative !size-11 !min-h-11 !min-w-11 shrink-0 justify-self-start rounded-full !border-0 !bg-transparent p-0 text-white !shadow-none hover:!bg-white/10 hover:text-white [&>svg]:size-4 after:absolute after:inset-0 after:content-['']";

/** Same hover box as mobile close (X). */
export const DRAWER_MOBILE_HEADER_ACTION_CLASS = DRAWER_MOBILE_CLOSE_ACTION_CLASS;

/** Force every IconButton in the mobile-brand header to match close. */
export const DRAWER_MOBILE_HEADER_ICON_BUTTON_SLOT_CLASS =
  "[&_[data-icon-button]]:relative [&_[data-icon-button]]:!size-11 [&_[data-icon-button]]:!min-h-11 [&_[data-icon-button]]:!min-w-11 [&_[data-icon-button]]:rounded-full [&_[data-icon-button]]:!border-0 [&_[data-icon-button]]:!bg-transparent [&_[data-icon-button]]:p-0 [&_[data-icon-button]]:text-white [&_[data-icon-button]]:!shadow-none [&_[data-icon-button]]:hover:!bg-white/10 [&_[data-icon-button]]:hover:text-white [&_[data-icon-button]_svg]:size-4";

/** Resets desktop `SHEET_HEADER_CLASS` padding when merged on mobile-brand chrome only. */
export const DRAWER_MOBILE_SHEET_HEADER_RESET_CLASS =
  "!gap-0 !border-b-0 !py-0";

/** Mobile Figma sidebars — full-bleed purple app bar (no spine). Uses `--mobile-top-bar-height`. */
export const DRAWER_MOBILE_HEADER_CLASS =
  `${MOBILE_LIST_HEADER_BG} ${MOBILE_TOP_BAR_SHELL_CLASS} ${DRAWER_MOBILE_SHEET_HEADER_RESET_CLASS} !px-3 sm:!px-4 [background-image:none] ` +
  DRAWER_MOBILE_HEADER_ICON_BUTTON_SLOT_CLASS;

export const DRAWER_MOBILE_HEADER_ROW_CLASS =
  "grid h-[var(--mobile-top-bar-height)] min-h-[var(--mobile-top-bar-height)] max-h-[var(--mobile-top-bar-height)] w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-1";

export const DRAWER_MOBILE_TITLE_CLASS =
  "truncate text-center text-[17px] font-bold leading-none tracking-normal text-white";

export const DRAWER_MOBILE_HEADER_ACTIONS_CLASS =
  "flex shrink-0 items-center justify-end justify-self-end gap-0.5";

/** Full-viewport sheet for mobile appointment / time-block sidebars. */
export const DRAWER_MOBILE_SHEET_CONTENT_CLASS =
  "h-dvh max-h-dvh w-full max-w-none overflow-hidden border-0 !bg-white shadow-none backdrop-blur-none [background-image:none] [--sheet-width:100dvw]";

export const DRAWER_MOBILE_SHELL_CLASS =
  "h-full min-h-0 w-full overflow-hidden bg-white";

/** Update-mode outlined Add Service / Add Note (Figma secondary small). */
export const DRAWER_ADD_ACTION_OUTLINE_CLASS =
  "box-border inline-flex h-8 min-h-8 max-h-8 w-auto max-w-full shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border border-violet-primary-normal bg-white px-3 py-0 text-[12px] font-bold leading-none text-violet-primary-normal shadow-none hover:bg-violet-primary-surface";

