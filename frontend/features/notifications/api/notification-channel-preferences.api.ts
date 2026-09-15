import { api } from "@/lib/api/client";

export type NotificationChannel = "EMAIL" | "SMS";

export interface NotificationChannelPreference {
  notificationKey: string;
  channel: NotificationChannel;
  isDefault: boolean;
}

export const APPOINTMENT_EXPRESS_COMPLETE_KEY =
  "appointment.express_complete" as const;

export function listNotificationChannelPreferences() {
  return api.get<NotificationChannelPreference[]>(
    "notification-channel-preferences",
  );
}

export function getNotificationChannelPreference(notificationKey: string) {
  return api.get<NotificationChannelPreference>(
    `notification-channel-preferences/${encodeURIComponent(notificationKey)}`,
  );
}

export function updateNotificationChannelPreference(body: {
  notificationKey: string;
  channel: NotificationChannel;
}) {
  return api.patch<NotificationChannelPreference>(
    "notification-channel-preferences",
    body,
  );
}
