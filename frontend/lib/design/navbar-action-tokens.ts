/**
 * Global navbar action-group recipes (Apps, Notifications, User menu).
 * Visual values live in globals.css / codesol-default-theme.css.
 */

/** Compact, even gap between Apps, Notifications, and the user trigger. */
export const NAVBAR_ACTION_CLUSTER_CLASS =
  "flex shrink-0 items-center gap-[var(--shell-navbar-action-gap)]";

/** Shared icon hit target for Apps / Notifications. */
export const NAVBAR_ACTION_ICON_CLASS =
  "inline-flex size-[var(--shell-navbar-action-size)] shrink-0 items-center justify-center rounded-[var(--shell-navbar-user-radius)] text-[var(--shell-navbar-foreground)] transition-colors hover:bg-[var(--shell-navbar-action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 data-[state=open]:bg-[var(--shell-navbar-action-hover)] aria-pressed:bg-[var(--shell-navbar-action-hover)]";

/**
 * User profile trigger hover pill.
 * Tune `--shell-navbar-user-padding-x/y` to adjust the hover target.
 */
export const NAVBAR_USER_TRIGGER_CLASS =
  "inline-flex h-auto min-h-[var(--shell-navbar-tab-height)] max-h-[var(--shell-navbar-height)] shrink-0 cursor-pointer appearance-none items-center gap-[var(--shell-navbar-user-gap)] rounded-[var(--shell-navbar-user-radius)] border-0 bg-transparent px-[var(--shell-navbar-user-padding-x)] py-[var(--shell-navbar-user-padding-y)] text-left font-sans text-[var(--shell-navbar-foreground)] transition-colors hover:bg-[var(--shell-navbar-action-hover)] hover:text-[var(--shell-navbar-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 data-popup-open:bg-[var(--shell-navbar-action-hover)] data-popup-open:text-[var(--shell-navbar-foreground)]";

export const NAVBAR_USER_MENU_CONTENT_CLASS =
  "w-56 overflow-visible rounded-[var(--radius-xl)] border border-border/40 bg-popover p-[var(--spacing-2)] text-popover-foreground shadow-elevation-lg [&_[data-slot=dropdown-menu-item]]:px-3 [&_[data-slot=dropdown-menu-item]]:py-2 [&_[data-slot=dropdown-menu-checkbox-item]]:px-3 [&_[data-slot=dropdown-menu-checkbox-item]]:py-2";

/** Matches `--shell-navbar-menu-offset` (0.5rem) for Base UI's numeric sideOffset. */
export const NAVBAR_USER_MENU_SIDE_OFFSET = 8;
