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

/** Providers that must always use OAuth / embedded signup, never the manual form. */
export const AUTOMATED_CONNECT_PROVIDER_KEYS = new Set([
  "facebook",
  "instagram",
  "whatsapp",
  "google-calendar",
  "google-business-profile",
  "google-lead-ads",
  "linkedin",
]);

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
  if (AUTOMATED_CONNECT_PROVIDER_KEYS.has(provider.key)) {
    return true;
  }
  return isOAuthProvider(provider);
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
  if (providerKey === "facebook" || providerKey === "instagram") {
    return getMetaOAuthStartUrl(providerKey);
  }
  if (providerKey === "whatsapp") {
    return getMetaOAuthStartUrl("whatsapp");
  }
  if (providerKey === "linkedin") {
    return "/api/oauth/linkedin/start";
  }
  const params = new URLSearchParams({ providerKey });
  return `/api/oauth/google/start?${params.toString()}`;
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
    if (isGoogleOAuthProvider(provider.key)) return "Connect with Google";
    if (shouldUseOAuthPopup(provider)) return `Connect ${provider.name}`;
    return "Connect";
  }
  return getIntegrationActionLabel(status);
}

const META_ENV_NOT_CONFIGURED_MESSAGE =
  "Meta integration is not configured. Please set META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI in backend environment.";

export const WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE =
  "WhatsApp Embedded Signup configuration ID is missing. Set META_EMBEDDED_SIGNUP_CONFIG_ID.";

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
    normalized.includes("meta_login_config_id") ||
    normalized.includes("meta login configuration id")
  ) {
    return "Meta Login configuration ID is missing. Set META_LOGIN_CONFIG_ID.";
  }
  if (
    normalized.includes("embedded_signup") ||
    normalized.includes("meta_embedded_signup_config_id") ||
    normalized.includes("whatsapp embedded signup configuration id")
  ) {
    return "WhatsApp Embedded Signup configuration ID is missing. Set META_EMBEDDED_SIGNUP_CONFIG_ID.";
  }
  if (normalized.includes("popup") || normalized.includes("blocked")) {
    return "Popup was blocked. Please allow popups for this site and try again.";
  }
  return error.replace(/_/g, " ");
}

export function getIntegrationReconnectLabel(
  provider: Pick<IntegrationProvider, "key" | "name" | "connectionType">,
): string {
  if (provider.key === "whatsapp") return "Reconnect WhatsApp";
  if (provider.key === "facebook") return "Reconnect Facebook";
  if (provider.key === "instagram") return "Reconnect Instagram";
  if (isGoogleOAuthProviderByConnection(provider)) {
    return "Reconnect with Google";
  }
  return `Reconnect ${provider.name}`;
}
