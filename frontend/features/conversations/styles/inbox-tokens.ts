/**
 * Conversations inbox — typography + composer density.
 * Hit-and-trial CSS variables live in `frontend/app/globals.css` (`:root`).
 */

/** Right-pane contact name (e.g. "Awais Arshad") — `--inbox-details-contact-name-weight`. */
export const INBOX_DETAILS_CONTACT_NAME_CLASS =
  "truncate text-[18px] leading-[22px] text-violet-primary-darker [font-weight:var(--inbox-details-contact-name-weight)]";

/** Empty secondary copy (e.g. "No upcoming appointment") — `--inbox-details-empty-state-weight`. */
export const INBOX_DETAILS_EMPTY_STATE_CLASS =
  "text-base leading-snug text-muted-foreground [font-weight:var(--inbox-details-empty-state-weight)]";

/** Reply / Note tab row — `--inbox-composer-tab-padding-y`. */
export const INBOX_COMPOSER_TAB_ROW_CLASS =
  "flex items-center justify-between gap-2 border-b px-4 py-[var(--inbox-composer-tab-padding-y)]";

/** Tab list inside composer — `--inbox-composer-tab-list-height`. */
export const INBOX_COMPOSER_TAB_LIST_CLASS =
  "h-[var(--inbox-composer-tab-list-height)] bg-transparent p-0";

/** To / Subject field rows — `--inbox-composer-field-row-height`, `--inbox-composer-field-row-padding-y`. */
export const INBOX_COMPOSER_FIELD_ROW_CLASS =
  "flex min-h-[var(--inbox-composer-field-row-height)] min-w-0 items-center gap-2 border-b border-border px-3 py-[var(--inbox-composer-field-row-padding-y)]";

/** To / Subject row label — `--inbox-composer-field-label-size`. */
export const INBOX_COMPOSER_FIELD_LABEL_CLASS =
  "w-12 shrink-0 text-[length:var(--inbox-composer-field-label-size)] font-medium leading-none text-muted-foreground";

/** Borderless subject input — `--inbox-composer-field-input-size`, `--inbox-composer-field-input-height`, `--inbox-composer-field-input-padding-x`. */
export const INBOX_COMPOSER_FIELD_INPUT_CLASS =
  "h-[var(--inbox-composer-field-input-height)] min-h-[var(--inbox-composer-field-input-height)] border-0 bg-transparent py-0 pl-[var(--inbox-composer-field-input-padding-x)] pr-0 text-[length:var(--inbox-composer-field-input-size)] leading-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground";

/** Thread composer outer footer — `--inbox-composer-footer-padding-bottom`. */
export const INBOX_COMPOSER_FOOTER_CLASS =
  "shrink-0 bg-white px-4 pb-[var(--inbox-composer-footer-padding-bottom)]";

/** Reply composer footer (icons + Send) — `--inbox-composer-toolbar-padding-y`. */
export const INBOX_COMPOSER_TOOLBAR_CLASS =
  "flex items-center gap-2 border-t border-border/50 px-4 py-[var(--inbox-composer-toolbar-padding-y)]";

/** Note composer footer — same vertical padding token as reply toolbar. */
export const INBOX_COMPOSER_NOTE_TOOLBAR_CLASS =
  "flex items-center gap-2 border-t border-warning/20 px-4 py-[var(--inbox-composer-toolbar-padding-y)]";
