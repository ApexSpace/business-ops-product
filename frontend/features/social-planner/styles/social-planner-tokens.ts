/**
 * Social Planner visual recipes — Figma Comments/Planner chrome.
 * Class composition only; colors/radius/spacing from globals.
 */

export const SOCIAL_PLANNER_TAB_LIST_CLASS =
  "inline-flex flex-wrap items-center gap-[var(--spacing-2)]";

export const SOCIAL_PLANNER_TAB_BASE_CLASS =
  "inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] px-[var(--spacing-4)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30";

export const SOCIAL_PLANNER_TAB_ACTIVE_CLASS =
  "bg-violet-primary-normal text-white";

export const SOCIAL_PLANNER_TAB_IDLE_CLASS =
  "border border-violet-primary-normal bg-white text-violet-primary-normal hover:bg-violet-primary-surface";

export const SOCIAL_PLANNER_CARD_CLASS =
  "rounded-[var(--radius-md)] border border-border bg-white p-[var(--spacing-4)] transition-colors";

export const SOCIAL_PLANNER_CARD_SELECTED_CLASS =
  "border-violet-primary-normal ring-1 ring-violet-primary-normal/20";

export const SOCIAL_PLANNER_META_ROW_CLASS =
  "flex min-w-0 flex-wrap items-center gap-[var(--spacing-2)] text-xs text-muted-foreground";

export const SOCIAL_PLANNER_POST_PREVIEW_CLASS =
  "flex items-center gap-[var(--spacing-3)] rounded-[var(--radius-md)] border border-border bg-muted/40 px-[var(--spacing-3)] py-[var(--spacing-2)]";

export const SOCIAL_PLANNER_THUMB_CLASS =
  "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-border bg-muted text-[10px] font-medium uppercase text-muted-foreground";

export const SOCIAL_PLANNER_AVATAR_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-primary-surface text-xs font-semibold text-violet-primary-normal";

export const SOCIAL_PLANNER_UNREAD_DOT_CLASS =
  "size-2 shrink-0 rounded-full bg-violet-primary-normal";

export const SOCIAL_PLANNER_VIEW_POST_CLASS =
  "inline-flex items-center gap-1 text-sm font-medium text-violet-primary-normal hover:underline";

export const SOCIAL_PLANNER_INLINE_COMPOSER_CLASS =
  "flex items-center gap-[var(--spacing-2)]";

export const SOCIAL_PLANNER_DRAWER_COMPOSER_CLASS =
  "space-y-[var(--spacing-3)] border-t border-border bg-white p-[var(--spacing-3)]";

export const SOCIAL_PLANNER_SEND_ICON_BTN_CLASS =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-violet-primary-normal text-white transition-colors hover:bg-violet-primary-darker disabled:pointer-events-none disabled:opacity-50";
