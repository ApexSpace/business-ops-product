import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type { GoogleSyncDirection } from "@/features/calendars/schemas/calendar-profile";

export type GoogleSyncStatus = "ACTIVE" | "ERROR" | "DISABLED";

export interface GoogleCalendarSyncStatus {
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

export interface GoogleCalendarSyncSummary {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  pushed: number;
  errors: string[];
}

export function formatGoogleSyncSummary(summary: GoogleCalendarSyncSummary): string {
  const parts = [
    summary.created > 0 ? `${summary.created} created` : null,
    summary.updated > 0 ? `${summary.updated} updated` : null,
    summary.pushed > 0 ? `${summary.pushed} pushed` : null,
    summary.skipped > 0 ? `${summary.skipped} skipped` : null,
  ].filter(Boolean);
  if (summary.errors.length > 0) {
    parts.push(`${summary.errors.length} error(s)`);
  }
  return parts.length > 0 ? parts.join(", ") : "Sync completed with no changes";
}

export function getAppointmentGoogleSyncLabel(appointment: Appointment): string | null {
  if (appointment.source === "GOOGLE_SYNC") {
    return "Imported from Google";
  }
  if (
    appointment.externalProvider === "GOOGLE_CALENDAR" &&
    appointment.externalEventId
  ) {
    return "Synced to Google";
  }
  return null;
}

export function hasGoogleSyncError(appointment: {
  googleSyncWarning?: string | null;
}): boolean {
  return Boolean(appointment.googleSyncWarning?.trim());
}
