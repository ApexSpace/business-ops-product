import { NotificationChannel } from '@prisma/client';

/** Reuses email-type registry keys for channel preferences. */
export const APPOINTMENT_EXPRESS_COMPLETE_KEY =
  'appointment.express_complete' as const;

/**
 * Notification keys that currently support EMAIL/SMS channel override.
 * Expand as more types gain SMS delivery.
 */
export const CHANNEL_OVERRIDE_NOTIFICATION_KEYS = [
  APPOINTMENT_EXPRESS_COMPLETE_KEY,
] as const;

export type ChannelOverrideNotificationKey =
  (typeof CHANNEL_OVERRIDE_NOTIFICATION_KEYS)[number];

export const DEFAULT_NOTIFICATION_CHANNEL = NotificationChannel.EMAIL;

export function isChannelOverrideNotificationKey(
  key: string,
): key is ChannelOverrideNotificationKey {
  return (CHANNEL_OVERRIDE_NOTIFICATION_KEYS as readonly string[]).includes(
    key,
  );
}
