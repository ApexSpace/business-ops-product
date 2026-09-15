import { NotificationChannel } from '@prisma/client';
import {
  isBusinessConfigurableEmailType,
  V1_EMAIL_TYPES,
} from '@app/modules/communications/email/email-type.registry';

/** Reuses email-type registry keys for channel preferences. */
export const APPOINTMENT_EXPRESS_COMPLETE_KEY =
  'appointment.express_complete' as const;

/**
 * Notification keys that support EMAIL/SMS channel override.
 * Derived from business-configurable email types (excludes system/auth and automation.workflow).
 */
export const CHANNEL_OVERRIDE_NOTIFICATION_KEYS = V1_EMAIL_TYPES.filter(
  (key) => isBusinessConfigurableEmailType(key),
) as readonly string[];

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
