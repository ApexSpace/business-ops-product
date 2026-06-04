export type IntegrationStatus =
  | "CONNECTED"
  | "ERROR"
  | "DISABLED"
  | "EXPIRED"
  | "NOT_CONNECTED";

export type IntegrationCategory =
  | "COMMUNICATION"
  | "CALENDAR"
  | "REPUTATION"
  | "PAYMENTS"
  | "SOCIAL_MEDIA"
  | "ACCOUNTING"
  | "AI"
  | "STORAGE"
  | "ADS"
  | "OTHER";

export type IntegrationConnectionType = "MANUAL" | "OAUTH" | "EMBEDDED_SIGNUP";

export interface IntegrationProvider {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: IntegrationCategory;
  logoUrl: string | null;
  isPlatformLevel: boolean;
  isBusinessLevel: boolean;
  isActive: boolean;
  sortOrder: number;
  connectionType: IntegrationConnectionType;
}

export interface IntegrationSummary {
  status: Exclude<IntegrationStatus, "NOT_CONNECTED">;
  connectedAccountName: string | null;
  connectedAccountEmail: string | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  connectedAt: string | null;
}

export interface IntegrationProviderWithStatus extends IntegrationProvider {
  status: IntegrationStatus;
  integration: IntegrationSummary | null;
}

export interface BusinessIntegration {
  id: string;
  businessId: string;
  providerKey: string;
  status: Exclude<IntegrationStatus, "NOT_CONNECTED">;
  config: Record<string, unknown> | null;
  connectedAccountName: string | null;
  connectedAccountEmail: string | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  connectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  provider: IntegrationProvider;
}

export interface PlatformIntegration {
  id: string;
  providerKey: string;
  status: Exclude<IntegrationStatus, "NOT_CONNECTED">;
  config: Record<string, unknown> | null;
  connectedAccountName: string | null;
  connectedAccountEmail: string | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  connectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  provider: IntegrationProvider;
}

export interface ConnectIntegrationPayload {
  config?: Record<string, unknown>;
  connectedAccountName?: string;
  connectedAccountEmail?: string;
}

export interface UpdateIntegrationPayload {
  status?: Exclude<IntegrationStatus, "NOT_CONNECTED">;
  config?: Record<string, unknown>;
  connectedAccountName?: string;
  connectedAccountEmail?: string;
  errorMessage?: string | null;
}

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  COMMUNICATION: "Communication",
  CALENDAR: "Calendar",
  REPUTATION: "Reputation",
  PAYMENTS: "Payments",
  SOCIAL_MEDIA: "Social Media",
  ACCOUNTING: "Accounting",
  AI: "AI",
  STORAGE: "Storage",
  ADS: "Ads",
  OTHER: "Other",
};

export const INTEGRATION_CATEGORY_TABS: Array<{
  value: IntegrationCategory | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "All" },
  { value: "COMMUNICATION", label: "Communication" },
  { value: "CALENDAR", label: "Calendar" },
  { value: "REPUTATION", label: "Reputation" },
  { value: "PAYMENTS", label: "Payments" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "ACCOUNTING", label: "Accounting" },
  { value: "AI", label: "AI" },
  { value: "ADS", label: "Ads" },
  { value: "STORAGE", label: "Storage" },
];

/** Connected (or previously connected) providers first, then not connected; preserves sortOrder within each group. */
export function sortIntegrationProvidersByConnection(
  providers: IntegrationProviderWithStatus[],
): IntegrationProviderWithStatus[] {
  return [...providers].sort((a, b) => {
    const aNotConnected = a.status === "NOT_CONNECTED" ? 1 : 0;
    const bNotConnected = b.status === "NOT_CONNECTED" ? 1 : 0;
    if (aNotConnected !== bNotConnected) {
      return aNotConnected - bNotConnected;
    }
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.name.localeCompare(b.name);
  });
}

export function filterIntegrationProvidersByCategory(
  providers: IntegrationProviderWithStatus[],
  category: IntegrationCategory | "ALL",
): IntegrationProviderWithStatus[] {
  const filtered =
    category === "ALL"
      ? providers
      : providers.filter((provider) => provider.category === category);
  return sortIntegrationProvidersByConnection(filtered);
}

export function getIntegrationActionLabel(
  status: IntegrationStatus,
): string {
  switch (status) {
    case "NOT_CONNECTED":
      return "Connect";
    case "CONNECTED":
      return "Manage";
    case "ERROR":
      return "Fix Issue";
    case "DISABLED":
      return "Enable";
    case "EXPIRED":
      return "Reconnect";
    default:
      return "Manage";
  }
}

export function getIntegrationManageLabel(
  provider: Pick<IntegrationProvider, "key" | "name">,
): string {
  if (provider.key === "facebook") return "Manage Facebook";
  if (provider.key === "instagram") return "Manage Instagram";
  if (provider.key === "whatsapp") return "Manage WhatsApp";
  if (provider.key === "stripe") return "Manage Stripe";
  if (isGoogleOAuthProvider(provider.key)) {
    return `Manage ${provider.name}`;
  }
  return `Manage ${provider.name}`;
}

export function getOAuthOpeningLabel(
  provider: Pick<IntegrationProvider, "key" | "name">,
): string {
  if (provider.key === "facebook") return "Opening Facebook…";
  if (provider.key === "instagram") return "Opening Instagram…";
  if (provider.key === "whatsapp") return "Opening WhatsApp…";
  if (provider.key === "stripe") return "Opening Stripe…";
  if (isGoogleOAuthProvider(provider.key)) return "Opening Google…";
  return "Opening authorization…";
}

export function formatIntegrationDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export const META_BUSINESS_PROVIDER_KEYS = [
  "facebook",
  "instagram",
  "whatsapp",
] as const;

export type MetaBusinessProviderKey =
  (typeof META_BUSINESS_PROVIDER_KEYS)[number];

export function isMetaBusinessProvider(providerKey: string): boolean {
  return (META_BUSINESS_PROVIDER_KEYS as readonly string[]).includes(
    providerKey,
  );
}

export function isGoogleOAuthProvider(providerKey: string): boolean {
  return (
    providerKey.startsWith("google-") && providerKey !== "google-oauth"
  );
}

/**
 * Explicit OAuth popup start routes per provider.
 * Do not use Google as a default fallback for unknown providers.
 */
export const OAUTH_START_ROUTES = {
  "google-calendar": "/api/oauth/google/start?providerKey=google-calendar",
  "google-business-profile":
    "/api/oauth/google/start?providerKey=google-business-profile",
  "google-lead-ads": "/api/oauth/google/start?providerKey=google-lead-ads",
  facebook: "/api/oauth/meta/start?providerKey=facebook",
  instagram: "/api/oauth/meta/start?providerKey=instagram",
  whatsapp: "/api/oauth/meta/whatsapp/start",
  linkedin: "/api/oauth/linkedin/start",
  stripe: "/api/oauth/stripe/start",
} as const;

export type OAuthStartProviderKey = keyof typeof OAUTH_START_ROUTES;

export const OAUTH_ROUTE_NOT_CONFIGURED_MESSAGE =
  "OAuth route is not configured for this provider.";

/** Providers that use OAuth popup or embedded signup — never the manual connect modal. */
export const AUTOMATED_CONNECT_PROVIDER_KEYS = new Set<string>(
  Object.keys(OAUTH_START_ROUTES),
);

export function hasOAuthStartRoute(
  providerKey: string,
): providerKey is OAuthStartProviderKey {
  return Object.prototype.hasOwnProperty.call(OAUTH_START_ROUTES, providerKey);
}

export function isOAuthProvider(
  provider: Pick<IntegrationProvider, "connectionType">,
): boolean {
  return (
    provider.connectionType === "OAUTH" ||
    provider.connectionType === "EMBEDDED_SIGNUP"
  );
}

/**
 * Whether Connect should open an OAuth popup (not the manual config modal).
 * Uses provider key allowlist so stale DB rows with MANUAL still work.
 */
export function shouldUseOAuthPopup(
  provider: Pick<IntegrationProvider, "connectionType" | "key">,
): boolean {
  if (usesWhatsAppEmbeddedSignup(provider.key)) {
    return false;
  }
  return hasOAuthStartRoute(provider.key);
}

export function shouldUseManualConnect(
  provider: Pick<IntegrationProvider, "connectionType" | "key">,
): boolean {
  return !shouldUseOAuthPopup(provider);
}

export function isGoogleOAuthProviderByConnection(
  provider: Pick<IntegrationProvider, "connectionType" | "key">,
): boolean {
  return (
    provider.connectionType === "OAUTH" && isGoogleOAuthProvider(provider.key)
  );
}

export function isMetaOAuthProviderByConnection(
  provider: Pick<IntegrationProvider, "connectionType" | "key">,
): boolean {
  return (
    (provider.connectionType === "OAUTH" ||
      provider.connectionType === "EMBEDDED_SIGNUP") &&
    isMetaBusinessProvider(provider.key)
  );
}

export function usesWhatsAppEmbeddedSignup(providerKey: string): boolean {
  return providerKey === "whatsapp";
}

/** Strict Meta OAuth start routes — no fallthrough between providers. */
export const META_OAUTH_START_ROUTES = {
  facebook: "/api/oauth/meta/start?providerKey=facebook",
  instagram: "/api/oauth/meta/start?providerKey=instagram",
  whatsapp: "/api/oauth/meta/whatsapp/start",
} as const satisfies Record<MetaBusinessProviderKey, string>;

export function getMetaOAuthStartUrl(
  providerKey: MetaBusinessProviderKey,
): string {
  return META_OAUTH_START_ROUTES[providerKey];
}

export function getOAuthStartUrl(providerKey: string): string {
  if (!hasOAuthStartRoute(providerKey)) {
    throw new Error(OAUTH_ROUTE_NOT_CONFIGURED_MESSAGE);
  }
  return OAUTH_START_ROUTES[providerKey];
}

/** @deprecated Use getOAuthStartUrl */
export function getGoogleOAuthStartUrl(providerKey: string): string {
  return getOAuthStartUrl(providerKey);
}

export function getIntegrationConnectLabel(
  provider: Pick<IntegrationProvider, "connectionType" | "name" | "key">,
  status: IntegrationStatus,
): string {
  if (status === "CONNECTED") {
    return getIntegrationManageLabel(provider);
  }
  if (status === "EXPIRED") {
    return getIntegrationReconnectLabel(provider);
  }
  if (status === "NOT_CONNECTED") {
    if (provider.key === "whatsapp") return "Connect WhatsApp";
    if (provider.key === "facebook") return "Connect Facebook";
    if (provider.key === "instagram") return "Connect Instagram";
    if (provider.key === "stripe") return "Connect Stripe";
    if (isGoogleOAuthProvider(provider.key)) return "Connect with Google";
    if (shouldUseOAuthPopup(provider)) return `Connect ${provider.name}`;
    return "Connect";
  }
  return getIntegrationActionLabel(status);
}

const META_ENV_NOT_CONFIGURED_MESSAGE =
  "Meta integration is not configured. Please set META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI in backend environment.";

export const META_FACEBOOK_LOGIN_NOT_CONFIGURED_MESSAGE =
  "Facebook Login configuration is missing. Please set META_FACEBOOK_LOGIN_CONFIG_ID.";

export const META_INSTAGRAM_LOGIN_NOT_CONFIGURED_MESSAGE =
  "Instagram Login configuration is missing. Please set META_INSTAGRAM_LOGIN_CONFIG_ID.";

export const WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE =
  "WhatsApp Embedded Signup configuration is missing. Please set META_EMBEDDED_SIGNUP_CONFIG_ID.";

export const META_INSTAGRAM_NO_ACCOUNTS_MESSAGE =
  "No linked Instagram account was found in the Pages returned by Meta. Please make sure you selected the Facebook Page that is connected to your Instagram Professional Account during authorization.";

export const META_INSTAGRAM_WRONG_OAUTH_FLOW_MESSAGE =
  "Instagram must connect through Facebook Login (not Instagram direct login). In Meta dashboard use Instagram → API setup with Facebook login, then set META_INSTAGRAM_LOGIN_CONFIG_ID to that Facebook Login for Business configuration ID.";

/** User-facing OAuth / config error messages for the callback page and toasts. */
export function formatOAuthErrorMessage(error: string): string {
  const normalized = error.toLowerCase();
  if (
    normalized.includes("meta_app_id") ||
    normalized.includes("meta integration is not configured") ||
    normalized.includes("meta oauth is not enabled") ||
    normalized.includes("meta app is not configured") ||
    normalized.includes("platform meta app") ||
    normalized.includes("oauth_start_failed")
  ) {
    return META_ENV_NOT_CONFIGURED_MESSAGE;
  }
  if (normalized.includes("google oauth is not enabled")) {
    return "Google OAuth is not configured. Contact your platform administrator.";
  }
  if (
    normalized.includes("linkedin oauth is not configured") ||
    normalized.includes("linkedin_client_id") ||
    normalized.includes("linkedin_client_secret") ||
    normalized.includes("linkedin_redirect_uri")
  ) {
    return "LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI.";
  }
  if (
    normalized.includes("meta_facebook_login") ||
    normalized.includes("facebook login configuration")
  ) {
    return META_FACEBOOK_LOGIN_NOT_CONFIGURED_MESSAGE;
  }
  if (
    normalized.includes("meta_instagram_login") ||
    normalized.includes("instagram login configuration")
  ) {
    return META_INSTAGRAM_LOGIN_NOT_CONFIGURED_MESSAGE;
  }
  if (
    normalized.includes("meta_login_config_id") ||
    normalized.includes("meta login configuration id")
  ) {
    return "Meta Login configuration ID is missing. Set META_FACEBOOK_LOGIN_CONFIG_ID and META_INSTAGRAM_LOGIN_CONFIG_ID (or META_LOGIN_CONFIG_ID as fallback).";
  }
  if (
    normalized.includes("embedded_signup") ||
    normalized.includes("meta_embedded_signup_config_id") ||
    normalized.includes("whatsapp embedded signup configuration")
  ) {
    return WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE;
  }
  if (
    normalized.includes("instagram direct login") ||
    normalized.includes("instagram.com") ||
    normalized.includes("instagram business login") ||
    normalized.includes("api setup with facebook login")
  ) {
    return META_INSTAGRAM_WRONG_OAUTH_FLOW_MESSAGE;
  }
  if (
    normalized.includes("oauth route is not configured") ||
    normalized.includes("oauth_route_not_configured")
  ) {
    return OAUTH_ROUTE_NOT_CONFIGURED_MESSAGE;
  }
  if (normalized.includes("oauth_wrong_handler")) {
    return OAUTH_ROUTE_NOT_CONFIGURED_MESSAGE;
  }
  if (
    normalized.includes("not a supported google oauth") ||
    normalized.includes("google_oauth_invalid_provider")
  ) {
    return "This integration does not use Google sign-in. Use the correct Connect action for this provider.";
  }
  if (
    normalized.includes("stripe connect is not configured") ||
    normalized.includes("stripe_secret_key") ||
    normalized.includes("stripe_client_id") ||
    normalized.includes("stripe_redirect_uri") ||
    normalized.includes("stripe_oauth_failed")
  ) {
    return "Stripe Connect is not configured. Please set STRIPE_SECRET_KEY, STRIPE_CLIENT_ID, and STRIPE_REDIRECT_URI.";
  }
  if (normalized.includes("popup") || normalized.includes("blocked")) {
    return "Popup was blocked. Please allow popups for this site and try again.";
  }
  return error.replace(/_/g, " ");
}

export function formatOAuthWarningMessage(warning: string): string | null {
  if (warning === "no_instagram_resources") {
    return META_INSTAGRAM_NO_ACCOUNTS_MESSAGE;
  }
  return null;
}

export function getIntegrationReconnectLabel(
  provider: Pick<IntegrationProvider, "key" | "name" | "connectionType">,
): string {
  if (provider.key === "whatsapp") return "Reconnect WhatsApp";
  if (provider.key === "facebook") return "Reconnect Facebook";
  if (provider.key === "instagram") return "Reconnect Instagram";
  if (provider.key === "stripe") return "Reconnect Stripe";
  if (isGoogleOAuthProviderByConnection(provider)) {
    return "Reconnect with Google";
  }
  return `Reconnect ${provider.name}`;
}
