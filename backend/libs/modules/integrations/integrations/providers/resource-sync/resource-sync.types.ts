import { UpsertIntegrationResourceInput } from '../../repositories/integration-resource.repository';

export interface ResourceSyncContext {
  businessId: string;
  providerKey: string;
  businessIntegrationId: string;
}

export interface ResourceSyncResult {
  items: UpsertIntegrationResourceInput[];
  synced: boolean;
}

export interface IntegrationResourceSyncHandler {
  readonly providerKey: string;
  sync(context: ResourceSyncContext): Promise<ResourceSyncResult>;
}

export const GOOGLE_CALENDAR_LIST_URL =
  'https://www.googleapis.com/calendar/v3/users/me/calendarList';

export const GOOGLE_BUSINESS_ACCOUNTS_URL =
  'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';

export const GOOGLE_BUSINESS_LOCATIONS_URL =
  'https://mybusinessbusinessinformation.googleapis.com/v1';
