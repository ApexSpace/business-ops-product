import {
  GoogleCalendarSyncSettings,
  GoogleSyncDirection,
  GoogleSyncStatus,
} from './google-calendar-sync.types';

export function parseGoogleSyncSettings(
  raw: unknown,
): GoogleCalendarSyncSettings {
  const value =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const syncDirection = normalizeSyncDirection(value.syncDirection);

  return {
    enabled: Boolean(value.enabled),
    providerKey:
      typeof value.providerKey === 'string'
        ? value.providerKey
        : 'google-calendar',
    businessIntegrationId:
      typeof value.businessIntegrationId === 'string'
        ? value.businessIntegrationId
        : null,
    integrationResourceId:
      typeof value.integrationResourceId === 'string'
        ? value.integrationResourceId
        : null,
    externalCalendarId:
      typeof value.externalCalendarId === 'string'
        ? value.externalCalendarId
        : null,
    syncDirection,
    lastSyncedAt:
      typeof value.lastSyncedAt === 'string' ? value.lastSyncedAt : null,
    syncStatus: normalizeSyncStatus(value.syncStatus),
    lastError: typeof value.lastError === 'string' ? value.lastError : null,
  };
}

function normalizeSyncDirection(value: unknown): GoogleSyncDirection {
  if (
    value === 'INTERNAL_TO_GOOGLE' ||
    value === 'GOOGLE_TO_INTERNAL' ||
    value === 'TWO_WAY' ||
    value === 'NONE'
  ) {
    return value;
  }
  return 'NONE';
}

function normalizeSyncStatus(value: unknown): GoogleSyncStatus | undefined {
  if (value === 'ACTIVE' || value === 'ERROR' || value === 'DISABLED') {
    return value;
  }
  return undefined;
}

export function canPushToGoogle(direction: GoogleSyncDirection): boolean {
  return direction === 'INTERNAL_TO_GOOGLE' || direction === 'TWO_WAY';
}

export function canPullFromGoogle(direction: GoogleSyncDirection): boolean {
  return direction === 'GOOGLE_TO_INTERNAL' || direction === 'TWO_WAY';
}

export function mergeGoogleSyncSettings(
  current: unknown,
  patch: Partial<GoogleCalendarSyncSettings>,
): GoogleCalendarSyncSettings {
  return { ...parseGoogleSyncSettings(current), ...patch };
}
