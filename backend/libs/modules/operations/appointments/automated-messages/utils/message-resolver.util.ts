import {
  AppointmentAutomatedMessageSourceScope,
  AppointmentAutomatedMessageTriggerKind,
  AppointmentSource,
} from '@prisma/client';
import { sourceMatchesScope } from './source-scope.util';

type MessageLike = {
  enabled: boolean;
  sourceScope: AppointmentAutomatedMessageSourceScope;
  notificationKey: string;
};

type TriggerLike = {
  kind: AppointmentAutomatedMessageTriggerKind;
  messages: MessageLike[];
};

export function matchingImmediateNotificationKeys(
  triggers: TriggerLike[],
  source: AppointmentSource | null | undefined,
): string[] {
  const keys = new Set<string>();
  for (const trigger of triggers) {
    if (trigger.kind !== AppointmentAutomatedMessageTriggerKind.IMMEDIATE) {
      continue;
    }
    for (const message of trigger.messages) {
      if (!message.enabled) continue;
      if (!sourceMatchesScope(source, message.sourceScope)) continue;
      keys.add(message.notificationKey);
    }
  }
  return [...keys];
}

export function matchingBeforeStartMessages(
  triggers: Array<
    TriggerLike & {
      id: string;
      offsetValue: number | null;
      offsetUnit: 'DAYS' | 'HOURS' | null;
      messages: Array<
        MessageLike & {
          id: string;
          sourceScope: AppointmentAutomatedMessageSourceScope;
        }
      >;
    }
  >,
  source: AppointmentSource | null | undefined,
) {
  return triggers
    .filter(
      (trigger) =>
        trigger.kind === AppointmentAutomatedMessageTriggerKind.BEFORE_START &&
        trigger.offsetValue != null &&
        trigger.offsetUnit != null,
    )
    .map((trigger) => ({
      triggerId: trigger.id,
      offsetValue: trigger.offsetValue!,
      offsetUnit: trigger.offsetUnit!,
      notificationKeys: [
        ...new Set(
          trigger.messages
            .filter(
              (message) =>
                message.enabled &&
                sourceMatchesScope(source, message.sourceScope),
            )
            .map((message) => message.notificationKey),
        ),
      ],
    }))
    .filter((row) => row.notificationKeys.length > 0);
}
