import { IntegrationResourceType } from '@prisma/client';

export interface ProviderResourceConfig {
  resourceTypes: IntegrationResourceType[];
  syncEnabled: boolean;
  label: string;
}

export const PROVIDER_RESOURCE_CONFIG: Record<string, ProviderResourceConfig> = {
  'google-calendar': {
    resourceTypes: [IntegrationResourceType.CALENDAR],
    syncEnabled: true,
    label: 'Calendars',
  },
  'google-business-profile': {
    resourceTypes: [IntegrationResourceType.GBP_LOCATION],
    syncEnabled: true,
    label: 'Business locations',
  },
  facebook: {
    resourceTypes: [IntegrationResourceType.FACEBOOK_PAGE],
    syncEnabled: true,
    label: 'Pages',
  },
  instagram: {
    resourceTypes: [IntegrationResourceType.INSTAGRAM_ACCOUNT],
    syncEnabled: true,
    label: 'Accounts',
  },
  whatsapp: {
    resourceTypes: [IntegrationResourceType.PHONE_NUMBER],
    syncEnabled: true,
    label: 'Phone numbers',
  },
  'google-lead-ads': {
    resourceTypes: [IntegrationResourceType.GOOGLE_ADS_ACCOUNT],
    syncEnabled: false,
    label: 'Ad accounts',
  },
  quickbooks: {
    resourceTypes: [IntegrationResourceType.QUICKBOOKS_COMPANY],
    syncEnabled: false,
    label: 'Companies',
  },
  xero: {
    resourceTypes: [IntegrationResourceType.XERO_TENANT],
    syncEnabled: false,
    label: 'Organisations',
  },
};

export function providerSupportsResources(providerKey: string): boolean {
  return providerKey in PROVIDER_RESOURCE_CONFIG;
}

export function getProviderResourceConfig(
  providerKey: string,
): ProviderResourceConfig | null {
  return PROVIDER_RESOURCE_CONFIG[providerKey] ?? null;
}

export const RESOURCE_SYNC_UNAVAILABLE_MESSAGE =
  'Resource sync will be available when provider handler is enabled.';
