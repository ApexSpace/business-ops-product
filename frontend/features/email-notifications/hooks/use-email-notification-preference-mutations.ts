"use client";

import {
  updateEmailPreferences,
  type EmailPreference,
} from "@/features/email-notifications/api/email-notifications.api";
import {
  updateNotificationChannelPreference,
  type NotificationChannel,
  type NotificationChannelPreference,
} from "@/features/notifications/api/notification-channel-preferences.api";
import { queryKeys } from "@/lib/query/keys";
import { useOptimisticQueryPatchMutation } from "@/lib/query/use-optimistic-query-patch-mutation";

type EmailPreferencePatch = { emailType: string; enabled: boolean };

export function useEmailNotificationPreferenceMutations() {
  const preferencesMutation = useOptimisticQueryPatchMutation<
    EmailPreference[],
    EmailPreferencePatch[],
    EmailPreference[]
  >({
    queryKey: queryKeys.emailNotifications.preferences(),
    mutationFn: updateEmailPreferences,
    applyOptimistic: (previous, preferences) => {
      const byType = new Map(
        preferences.map((item) => [item.emailType, item.enabled] as const),
      );
      return previous.map((item) => {
        const enabled = byType.get(item.emailType);
        return enabled === undefined ? item : { ...item, enabled };
      });
    },
    successMessage: "Notification preferences updated",
    invalidate: (qc) =>
      qc.invalidateQueries({ queryKey: queryKeys.emailNotifications.all() }),
  });

  const channelMutation = useOptimisticQueryPatchMutation<
    NotificationChannelPreference[],
    { notificationKey: string; channel: NotificationChannel },
    NotificationChannelPreference
  >({
    queryKey: queryKeys.notificationChannelPreferences.all(),
    mutationFn: updateNotificationChannelPreference,
    applyOptimistic: (previous, body) => {
      const index = previous.findIndex(
        (item) => item.notificationKey === body.notificationKey,
      );
      if (index === -1) {
        return [
          ...previous,
          {
            notificationKey: body.notificationKey,
            channel: body.channel,
            isDefault: false,
          },
        ];
      }
      return previous.map((item, i) =>
        i === index ? { ...item, channel: body.channel } : item,
      );
    },
    resolveData: (previous = [], result) => {
      const index = previous.findIndex(
        (item) => item.notificationKey === result.notificationKey,
      );
      if (index === -1) return [...previous, result];
      return previous.map((item, i) => (i === index ? result : item));
    },
    successMessage: "Delivery channel saved",
    invalidate: (qc) =>
      qc.invalidateQueries({
        queryKey: queryKeys.notificationChannelPreferences.all(),
      }),
  });

  return { preferencesMutation, channelMutation };
}
