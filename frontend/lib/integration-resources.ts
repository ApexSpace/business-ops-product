export type IntegrationResourceStatus = "ACTIVE" | "INACTIVE" | "ERROR";

export type IntegrationResourceType =
  | "CALENDAR"
  | "GBP_LOCATION"
  | "FACEBOOK_PAGE"
  | "INSTAGRAM_ACCOUNT"
  | "GOOGLE_ADS_ACCOUNT"
  | "QUICKBOOKS_COMPANY"
  | "XERO_TENANT"
  | "EMAIL_ACCOUNT"
  | "PHONE_NUMBER"
  | "OTHER";

export interface IntegrationResource {
  id: string;
  businessIntegrationId: string;
  businessId: string;
  providerKey: string;
  externalId: string;
  name: string;
  type: IntegrationResourceType;
  metadata: Record<string, unknown> | null;
  isSelected: boolean;
  isDefault: boolean;
  status: IntegrationResourceStatus;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationResourcesListResponse {
  resources: IntegrationResource[];
  providerKey: string;
  supportsResources: boolean;
  syncEnabled: boolean;
  resourceLabel: string | null;
}

export interface SyncIntegrationResourcesResponse {
  resources: IntegrationResource[];
  synced: boolean;
  message: string | null;
}

export const PROVIDERS_WITH_RESOURCES = new Set([
  "google-calendar",
  "google-business-profile",
  "whatsapp",
  "facebook",
  "instagram",
  "google-lead-ads",
  "quickbooks",
  "xero",
  "linkedin",
]);

export const RESOURCE_TYPE_LABELS: Record<IntegrationResourceType, string> = {
  CALENDAR: "Calendar",
  GBP_LOCATION: "Business location",
  FACEBOOK_PAGE: "Facebook page",
  INSTAGRAM_ACCOUNT: "Instagram account",
  GOOGLE_ADS_ACCOUNT: "Google Ads account",
  QUICKBOOKS_COMPANY: "QuickBooks company",
  XERO_TENANT: "Xero organisation",
  EMAIL_ACCOUNT: "Email account",
  PHONE_NUMBER: "Phone number",
  OTHER: "Other",
};

export function providerSupportsResources(providerKey: string): boolean {
  return PROVIDERS_WITH_RESOURCES.has(providerKey);
}

export function formatResourceDate(value: string | null): string {
  if (!value) return "Never synced";
  return new Date(value).toLocaleString();
}
