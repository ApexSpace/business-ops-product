export type GoogleSyncDirection =
  | 'NONE'
  | 'INTERNAL_TO_GOOGLE'
  | 'GOOGLE_TO_INTERNAL'
  | 'TWO_WAY';

export type GoogleSyncStatus = 'ACTIVE' | 'ERROR' | 'DISABLED';

export interface GoogleCalendarSyncSettings {
  enabled: boolean;
  providerKey?: string;
  businessIntegrationId?: string | null;
  integrationResourceId?: string | null;
  externalCalendarId?: string | null;
  syncDirection: GoogleSyncDirection;
  lastSyncedAt?: string | null;
  syncStatus?: GoogleSyncStatus;
  lastError?: string | null;
}

export interface GoogleCalendarSyncSummary {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  pushed: number;
  errors: string[];
}

export interface GoogleCalendarSyncStatusResponse {
  enabled: boolean;
  syncDirection: GoogleSyncDirection;
  syncStatus: GoogleSyncStatus | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  externalCalendarId: string | null;
  integrationResourceId: string | null;
  connectedAccountEmail: string | null;
  canSync: boolean;
  canPull: boolean;
  canPush: boolean;
}

export interface GoogleCalendarEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: GoogleCalendarEventDateTime;
  end?: GoogleCalendarEventDateTime;
  updated?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export interface GoogleCalendarEventsListResponse {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}
