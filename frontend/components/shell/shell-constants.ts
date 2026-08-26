/**
 * Dashboard navbar fill — `--cs-shell-navbar-surface` in codesol-default-theme.css.
 * Used for browser chrome (`theme-color`) so Safari/Chrome match the top bar.
 */
export const NAVBAR_SURFACE_HEX = "#6a2bd6";

/** Shared chrome height — sidebar header aligns with topbar. */
export const SHELL_HEADER_HEIGHT =
  "flex h-14 shrink-0 items-center border-b border-sidebar-border";

/** Default platform mark (monogram) in the business shell. */
export const PANDACUE_BRAND_LOGO_URL = "/branding/Monogram.png";

/**
 * True when the default logo already includes the brand wordmark (no text label).
 * Monogram is icon-only, so the product name is shown next to it.
 */
export const BRAND_LOGO_IS_WORDMARK = false;
