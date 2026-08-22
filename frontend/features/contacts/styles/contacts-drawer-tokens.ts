/**
 * Contacts drawers — shared recipes from `@/lib/design/drawer-tokens`.
 * Domain-only contacts extras (timeline, accordion) remain below.
 *
 * Ownership: do not add raw brand color / radius / control-height here.
 * Alias DRAWER_* recipes; extras must reference CSS variables.
 */
export {
  DRAWER_SHELL_CLASS as CONTACTS_DRAWER_SHELL_CLASS,
  DRAWER_SHELL_HEADER_CLASS as CONTACTS_DRAWER_SHELL_HEADER_CLASS,
  DRAWER_BODY_INSET_CLASS as CONTACTS_DRAWER_BODY_INSET_CLASS,
  DRAWER_FOOTER_CLASS as CONTACTS_DRAWER_FOOTER_CLASS,
  DRAWER_FOOTER_INNER_CLASS as CONTACTS_DRAWER_FOOTER_INNER_CLASS,
  DRAWER_PRIMARY_BUTTON_CLASS as CONTACTS_DRAWER_PRIMARY_BUTTON_CLASS,
  DRAWER_HEADER_ACTION_CLASS as CONTACTS_DRAWER_HEADER_ACTION_CLASS,
  DRAWER_FIELD_CLASS as CONTACTS_DRAWER_FIELD_CLASS,
  DRAWER_SELECT_TRIGGER_CLASS as CONTACTS_DRAWER_SELECT_TRIGGER_CLASS,
  DRAWER_FORM_FIELDS_CLASS as CONTACTS_DRAWER_FORM_FIELDS_CLASS,
  DRAWER_FIELD_GROUP_CLASS as CONTACTS_DRAWER_FIELD_GROUP_CLASS,
  DRAWER_ADD_ACTION_CLASS as CONTACTS_DRAWER_ADD_ACTION_CLASS,
  DRAWER_ADD_ACTION_ICON_CLASS as CONTACTS_DRAWER_ADD_ACTION_ICON_CLASS,
  DRAWER_MOBILE_SHELL_CLASS as CONTACTS_DRAWER_MOBILE_SHELL_CLASS,
  DRAWER_MOBILE_HEADER_ACTION_CLASS as CONTACTS_DRAWER_MOBILE_HEADER_ACTION_CLASS,
} from "@/lib/design/drawer-tokens";

export const CONTACTS_DRAWER_SPINE_LABELS = {
  options: "OPTIONS",
  clientDetails: "CLIENT DETAILS",
} as const;

/** Figma Client Details accordion list — top border + 4px gap */
export const CONTACTS_ACCORDION_LIST_CLASS =
  "flex w-full min-w-0 flex-col gap-1 border-t border-[var(--mobile-list-border)] pt-4";

/** Figma accordion row — hug 44, radius 8, pad 12 */
export const CONTACTS_ACCORDION_ROW_CLASS =
  "flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-left text-[14px] font-medium leading-none text-[var(--drawer-text-primary)] transition-colors duration-150 hover:bg-violet-primary-surface";

export const CONTACTS_ACCORDION_ICON_CLASS =
  "size-5 shrink-0 text-violet-primary-normal";

/** Figma avatar — 92px circle (create + view) */
export const CONTACTS_AVATAR_SIZE_CLASS = "size-[92px]";

/** Create drawer — dashed upload ring */
export const CONTACTS_AVATAR_RING_CLASS =
  "relative mx-auto flex size-[92px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[var(--mobile-list-border)] bg-violet-primary-surface";

/** View drawer — solid initials avatar (Figma Client Details) */
export const CONTACTS_AVATAR_VIEW_CLASS =
  "relative mx-auto flex size-[92px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--info)] text-[28px] font-bold leading-none text-white ring-0";

export const CONTACTS_AVATAR_UPLOAD_BTN_CLASS =
  "absolute -bottom-0.5 -right-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-white text-violet-primary-normal shadow-sm hover:bg-violet-primary-surface";

/** Label above value — Figma 13px medium muted */
export const CONTACTS_DETAIL_FIELD_LABEL_CLASS =
  "block text-[13px] font-medium leading-none text-[var(--drawer-text-meta)]";

/** Value under label — Figma 14px regular charcoal */
export const CONTACTS_DETAIL_FIELD_VALUE_CLASS =
  "text-[14px] font-normal leading-5 text-[var(--drawer-text-primary)] break-words";

/** Field row — fill × hug, 8px stack gap, 6px bottom pad (Figma) */
export const CONTACTS_DETAIL_FIELD_ROW_CLASS =
  "flex w-full min-w-0 flex-col gap-1.5 border-b border-[var(--drawer-header-border)] pb-1.5 pt-2";

/** Profile field stack — vertical (parent drops final divider) */
export const CONTACTS_DETAIL_FIELD_STACK_CLASS =
  "flex w-full min-w-0 flex-col gap-2";

/** Timeline filter chip — inactive: white, soft border, dark text, pad 6/16 */
export const CONTACTS_TIMELINE_CHIP_CLASS =
  "inline-flex h-[30px] min-h-[30px] max-h-[30px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full border border-[var(--mobile-list-border)] bg-white px-4 text-[13px] font-medium leading-none text-[var(--drawer-text-primary)] transition-colors duration-150 hover:bg-violet-primary-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/25";

/** Timeline filter chip — active: solid violet */
export const CONTACTS_TIMELINE_CHIP_ACTIVE_CLASS =
  "inline-flex h-[30px] min-h-[30px] max-h-[30px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full border border-violet-primary-normal bg-violet-primary-normal px-4 text-[13px] font-medium leading-none text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/25";

/** Timeline chips row — Figma gap 8 */
export const CONTACTS_TIMELINE_CHIPS_ROW_CLASS =
  "flex w-full min-w-0 flex-wrap items-center gap-2";

/** Timeline event card — 12px radius, 16px pad (compact), soft shadow */
export const CONTACTS_TIMELINE_CARD_CLASS =
  "flex w-full min-w-0 flex-col gap-1 rounded-xl border border-[var(--drawer-divider)] bg-white p-4 shadow-[0_4px_12px_rgba(28,27,46,0.04)] sm:p-5";

/** Timeline meta line */
export const CONTACTS_TIMELINE_META_CLASS =
  "text-[12px] font-normal leading-[16px] text-[var(--drawer-text-secondary)]";

/** Timeline card title — compact 15/20, not oversized */
export const CONTACTS_TIMELINE_TITLE_CLASS =
  "text-[15px] font-semibold leading-5 text-[var(--drawer-text-primary)]";

/** Timeline card body / subtitle */
export const CONTACTS_TIMELINE_SUBTITLE_CLASS =
  "text-[13px] font-normal leading-5 text-[var(--drawer-text-meta)]";

/** Highlight badge — requested staff (not a lifecycle status). */
export const CONTACTS_STATUS_REQUESTED_CLASS =
  "inline-flex max-w-full shrink-0 items-center gap-1 rounded border border-[color-mix(in_srgb,var(--cs-amber)_35%,white)] bg-[var(--cs-amber-tint)] px-2 py-0.5 text-[11px] font-medium leading-none text-[var(--cs-amber)] whitespace-nowrap";

/** Timeline rail + node — 14px node centered on 1px rail */
export const CONTACTS_TIMELINE_DOT_CLASS =
  "relative z-[1] size-3.5 shrink-0 rounded-full bg-violet-primary-normal ring-[3px] ring-[var(--drawer-tab-track)]";

export const CONTACTS_TIMELINE_RAIL_CLASS =
  "absolute bottom-4 left-[7px] top-4 w-px -translate-x-1/2 bg-[var(--mobile-list-border)]";

/** Entry composer shell */
export const CONTACTS_ENTRY_COMPOSER_CLASS =
  "flex w-full min-w-0 flex-col gap-3 rounded-xl border border-[var(--drawer-field-border)] bg-white p-3.5 sm:p-4";

export const CONTACTS_ENTRY_TEXTAREA_CLASS =
  "min-h-[64px] w-full resize-none border-0 bg-transparent p-0 text-[14px] leading-5 text-[var(--drawer-text-primary)] shadow-none placeholder:text-[var(--drawer-icon-gear)] focus-visible:ring-0";

export const CONTACTS_ENTRY_UPLOAD_CLASS =
  "inline-flex h-5 items-center gap-2 text-[13px] font-medium leading-none text-violet-primary-normal hover:underline";

export const CONTACTS_ENTRY_ADD_BTN_CLASS =
  "inline-flex h-8 min-h-8 max-h-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-0 bg-violet-primary-normal px-4 text-[13px] font-semibold leading-none text-white shadow-none hover:bg-violet-primary-normal-hover disabled:opacity-50";
