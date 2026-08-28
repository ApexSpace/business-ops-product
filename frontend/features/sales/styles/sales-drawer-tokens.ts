/**
 * Sales drawer chrome — shared recipes from `@/lib/design/drawer-tokens`.
 * Domain-only sales extras remain below.
 *
 * Ownership: do not add raw brand color / radius / control-height here.
 * Alias DRAWER_* recipes; extras must reference CSS variables.
 */
export {
  DRAWER_SHELL_CLASS as SALES_DRAWER_SHELL_CLASS,
  DRAWER_SHELL_HEADER_CLASS as SALES_DRAWER_SHELL_HEADER_CLASS,
  DRAWER_BODY_INSET_CLASS as SALES_DRAWER_BODY_INSET_CLASS,
  DRAWER_FOOTER_CLASS as SALES_DRAWER_FOOTER_CLASS,
  DRAWER_FOOTER_INNER_CLASS as SALES_DRAWER_FOOTER_INNER_CLASS,
  DRAWER_PRIMARY_BUTTON_CLASS as SALES_DRAWER_PRIMARY_BUTTON_CLASS,
  DRAWER_HEADER_ACTION_CLASS as SALES_DRAWER_HEADER_ACTION_CLASS,
  DRAWER_FIELD_CLASS as SALES_DRAWER_FIELD_CLASS,
  DRAWER_SELECT_TRIGGER_CLASS as SALES_DRAWER_SELECT_TRIGGER_CLASS,
  DRAWER_FORM_FIELDS_CLASS as SALES_DRAWER_FORM_FIELDS_CLASS,
  DRAWER_FIELD_GROUP_CLASS as SALES_DRAWER_FIELD_GROUP_CLASS,
  DRAWER_CLIENT_CARD_CLASS as SALES_DRAWER_CLIENT_CARD_CLASS,
  DRAWER_CLIENT_AVATAR_CLASS as SALES_DRAWER_CLIENT_AVATAR_CLASS,
  DRAWER_CLIENT_AVATAR_FALLBACK_CLASS as SALES_DRAWER_CLIENT_AVATAR_FALLBACK_CLASS,
  DRAWER_CLIENT_NAME_CLASS as SALES_DRAWER_CLIENT_NAME_CLASS,
  DRAWER_CLIENT_SINCE_CLASS as SALES_DRAWER_CLIENT_SINCE_CLASS,
  DRAWER_SERVICE_CARD_CLASS as SALES_DRAWER_SERVICE_CARD_CLASS,
  DRAWER_SERVICE_TITLE_CLASS as SALES_DRAWER_SERVICE_TITLE_CLASS,
  DRAWER_SERVICE_PRICE_CLASS as SALES_DRAWER_SERVICE_PRICE_CLASS,
  DRAWER_SERVICE_PROVIDER_CLASS as SALES_DRAWER_SERVICE_PROVIDER_CLASS,
  DRAWER_ADD_ACTION_CLASS as SALES_DRAWER_ADD_ACTION_CLASS,
  DRAWER_ADD_ACTION_ICON_CLASS as SALES_DRAWER_ADD_ACTION_ICON_CLASS,
  DRAWER_ICON_BUTTON_CLASS as SALES_DRAWER_ICON_BUTTON_CLASS,
  DRAWER_VIEW_FIELD_LABEL_CLASS as SALES_DRAWER_VIEW_FIELD_LABEL_CLASS,
  DRAWER_MOBILE_SHELL_CLASS as SALES_DRAWER_MOBILE_SHELL_CLASS,
  DRAWER_MOBILE_HEADER_ACTION_CLASS as SALES_DRAWER_MOBILE_HEADER_ACTION_CLASS,
  DRAWER_SPINE_CLASS as SALES_DRAWER_SPINE_CLASS,
  DRAWER_SPINE_LABEL_CLASS as SALES_DRAWER_SPINE_LABEL_CLASS,
} from "@/lib/design/drawer-tokens";

/** Vertical purpose labels for sales drawers (Figma). */
export const SALES_DRAWER_SPINE_LABELS = {
  sale: "SALE",
  options: "OPTIONS",
  checkout: "CHECKOUT",
  payment: "PAYMENT",
} as const;

/** Checkout add-row stack — vertical · `--drawer-section-gap`. */
export const SALES_DRAWER_ADD_ACTIONS_STACK_CLASS =
  "flex w-full min-w-0 flex-col items-start gap-drawer-section";

/** Figma checkout line card — outer shell (white; header/body sections inside). */
export const SALES_DRAWER_CHECKOUT_LINE_CARD_SHELL_CLASS =
  "overflow-hidden rounded-[var(--radius-md)] border border-[var(--drawer-field-border)] bg-white";

/** Figma checkout line card — collapsed row padding. */
export const SALES_DRAWER_LINE_CARD_CLASS =
  "rounded-[var(--radius-md)] border border-[var(--drawer-field-border)] bg-white px-3 py-3";

/** Figma checkout line card — expanded header band (lavender only on title row). */
export const SALES_DRAWER_LINE_CARD_EXPANDED_HEADER_CLASS =
  "bg-violet-primary-surface px-3 py-2.5";

/** @deprecated Whole-card lavender — use shell + expanded header band instead. */
export const SALES_DRAWER_LINE_CARD_EXPANDED_CLASS =
  "rounded-[var(--radius-md)] border border-transparent bg-violet-primary-surface px-3 py-2.5";

/** Line card header — full-row expand/collapse target (chevron + title [+ price]). */
export const SALES_DRAWER_LINE_CARD_HEADER_TOGGLE_CLASS =
  "flex min-w-0 flex-1 items-start gap-2.5 rounded-[var(--radius-sm)] text-left hover:text-violet-primary-darker focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/20";

/** Chevron slot in line card header — 24px hit area aligned to title. */
export const SALES_DRAWER_LINE_CARD_CHEVRON_CLASS =
  "inline-flex size-6 shrink-0 items-center justify-center text-[#8A8A8A]";

/** Expanded line card body — white detail section under lavender header. */
export const SALES_DRAWER_LINE_CARD_EXPANDED_BODY_CLASS =
  "flex w-full min-w-0 flex-col gap-drawer-stack px-3 pb-3 pt-drawer-field";

/** Product line two-column field grid in expanded card. */
export const SALES_DRAWER_LINE_CARD_FIELD_GRID_CLASS =
  "grid grid-cols-2 gap-drawer-stack";

/** Figma checkout subtotal row above primary CTA. */
export const SALES_DRAWER_SUBTOTAL_ROW_CLASS =
  "flex w-full min-w-0 items-center justify-between gap-3 text-[14px] font-medium leading-none text-[var(--drawer-text-primary)]";

export const SALES_DRAWER_PROVIDER_PILL_CLASS =
  "inline-flex max-w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-full bg-[var(--mobile-status-neutral-bg)] px-2 py-0.5 text-[12px] font-medium leading-[15px] text-[var(--drawer-text-meta)]";

/** Inline add panel above Add Service / Product / More. */
export const SALES_DRAWER_INLINE_ADD_PANEL_CLASS =
  "rounded-[var(--radius-md)] border border-[var(--drawer-field-border)] bg-violet-primary-surface/60 p-4";

export const SALES_DRAWER_INLINE_ADD_TITLE_CLASS =
  "text-[13px] font-semibold leading-none text-violet-primary-darker";

/* ─── Sales / checkout dialogs (modals over sidebar) ─── */

export const SALES_DIALOG_CONTENT_CLASS =
  "z-[70] gap-0 overflow-hidden rounded-[var(--radius-2xl)] border-0 bg-white p-0 shadow-[0_16px_48px_rgba(44,27,21,0.14)] ring-1 ring-[var(--drawer-field-border)]";

export const SALES_DIALOG_HEADER_CLASS =
  "shrink-0 space-y-1 border-b border-[var(--drawer-header-border)] px-5 py-4 text-left sm:text-left";

export const SALES_DIALOG_TITLE_CLASS =
  "text-[18px] font-bold leading-none tracking-normal text-violet-primary-darker";

export const SALES_DIALOG_DESCRIPTION_CLASS =
  "text-[13px] font-medium leading-snug text-[var(--drawer-text-secondary)]";

export const SALES_DIALOG_BODY_CLASS =
  "flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4";

export const SALES_DIALOG_FIELD_CLASS =
  "flex w-full min-w-0 flex-col gap-2";

export const SALES_DIALOG_LABEL_CLASS =
  "text-[13px] font-semibold leading-none text-[var(--drawer-text-label)]";

export const SALES_DIALOG_FOOTER_CLASS =
  "!grid shrink-0 !grid-cols-2 !gap-3 !border-t !border-[var(--drawer-header-border)] !bg-white !px-5 !py-4 sm:!grid-cols-2";

export const SALES_DIALOG_FOOTER_STACK_CLASS =
  "flex shrink-0 flex-col gap-3 border-t border-[var(--drawer-header-border)] bg-white px-5 py-4";

export const SALES_DIALOG_SECONDARY_BUTTON_CLASS =
  "h-11 min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--drawer-field-border)] !bg-white px-4 text-[14px] font-semibold text-[var(--drawer-text-label)] shadow-none hover:!bg-[var(--pc-grey-tertiary-light)] focus-visible:ring-2 focus-visible:ring-violet-primary-normal/20";

export const SALES_DIALOG_DESTRUCTIVE_BUTTON_CLASS =
  "h-11 min-h-11 w-full rounded-[var(--radius-sm)] border-0 !bg-destructive px-4 text-[14px] font-bold text-white shadow-none hover:!bg-[color-mix(in_srgb,var(--destructive)_88%,black)] focus-visible:ring-2 focus-visible:ring-destructive/25 disabled:opacity-60";

export const SALES_DIALOG_META_ROW_CLASS =
  "flex items-center justify-between gap-3 text-[13px] font-medium";

export const SALES_DIALOG_META_LABEL_CLASS = "text-[var(--drawer-text-secondary)]";

export const SALES_DIALOG_META_VALUE_CLASS =
  "tabular-nums text-[var(--drawer-text-primary)]";

export const SALES_DIALOG_TOTAL_ROW_CLASS =
  "flex items-center justify-between gap-3 border-t border-[var(--drawer-header-border)] pt-3 text-[14px] font-bold text-violet-primary-darker";

/* ─── Payment drawer (Figma) ─── */

export const SALES_PAYMENT_SUMMARY_CARD_CLASS =
  "overflow-hidden rounded-[var(--radius-xl)] border border-[var(--drawer-field-border)] bg-white";

export const SALES_PAYMENT_SUMMARY_BODY_CLASS =
  "space-y-3 px-4 py-4";

export const SALES_PAYMENT_SUMMARY_TOTAL_BAR_CLASS =
  "flex items-center justify-between gap-3 bg-violet-primary-surface px-4 py-3 text-[16px] font-bold text-violet-primary-darker";

export const SALES_PAYMENT_TIP_GRID_CLASS =
  "grid grid-cols-4 gap-2";

export const SALES_PAYMENT_TIP_CHIP_CLASS =
  "inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--drawer-field-border)] bg-white text-[13px] font-semibold text-[var(--drawer-text-label)] transition-colors hover:border-violet-primary-normal/40";

export const SALES_PAYMENT_TIP_CHIP_ACTIVE_CLASS =
  "border-violet-primary-normal bg-violet-primary-surface text-violet-primary-darker";

export const SALES_PAYMENT_METHOD_GRID_CLASS =
  "grid grid-cols-2 gap-2.5";

export const SALES_PAYMENT_METHOD_CARD_CLASS =
  "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--drawer-field-border)] bg-white px-2 py-3 text-center transition-colors hover:border-violet-primary-normal/50";

export const SALES_PAYMENT_METHOD_CARD_ACTIVE_CLASS =
  "border-violet-primary-normal bg-violet-primary-surface text-violet-primary-darker";

export const SALES_PAYMENT_OTHER_METHOD_CLASS =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--pc-black-secondary-light-active)] bg-white text-[13px] font-semibold text-[var(--drawer-text-meta)] hover:border-violet-primary-normal hover:text-violet-primary-darker";

export const SALES_PAYMENT_SECTION_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--drawer-text-secondary)]";

export const SALES_PAYMENT_RESET_LINK_CLASS =
  "text-[13px] font-medium text-violet-primary-normal hover:underline";

export const SALES_DRAWER_TEXTAREA_CLASS =
  "min-h-[88px] w-full max-w-full rounded-[var(--radius-sm)] border border-[var(--drawer-field-border)] bg-white px-3 py-2.5 text-[14px] shadow-none focus-visible:border-violet-primary-normal focus-visible:ring-2 focus-visible:ring-violet-primary-normal/20";

export const SALES_DRAWER_SUMMARY_BLOCK_CLASS =
  "space-y-2.5 border-t border-[var(--drawer-header-border)] pt-4";
