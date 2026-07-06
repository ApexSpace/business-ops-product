/** Per-client theme overrides (Product-as-a-Service white-labeling). */
export interface ClientThemeConfig {
  /** Display name shown in shell chrome. */
  productName?: string;
  logoUrl?: string;
  /** Maps to --cs-blue / --primary. Snapshot field: accentColor. */
  primaryColor?: string;
  /** Maps to --cs-navy / --sidebar. */
  sidebarColor?: string;
  publicPageTitle?: string;
}

/** CSS custom properties that applyClientTheme may set on :root. */
export const CLIENT_THEME_CSS_VARS = [
  "--cs-blue",
  "--cs-navy",
  "--cs-blue-tint",
  "--cs-blue-text",
  "--cs-page-orb-1",
  "--cs-page-orb-2",
  "--cs-shell-topbar-surface",
] as const;

export type ClientThemeCssVar = (typeof CLIENT_THEME_CSS_VARS)[number];
