import type {
  AppointmentAutomatedMessage,
  AppointmentAutomatedMessageTrigger,
  BusinessAppointmentAutomatedMessageSettings,
} from '@prisma/client';
import {
  AppointmentAutomatedMessageDto,
  AppointmentAutomatedMessageSettingsDto,
  AppointmentAutomatedMessageTriggerDto,
} from '../dto/appointment-automated-messages.dto';

type TriggerWithMessages = AppointmentAutomatedMessageTrigger & {
  messages: AppointmentAutomatedMessage[];
};

type SettingsWithTriggers = BusinessAppointmentAutomatedMessageSettings & {
  triggers: TriggerWithMessages[];
};

export function toMessageDto(
  message: AppointmentAutomatedMessage,
): AppointmentAutomatedMessageDto {
  return {
    id: message.id,
    sourceScope: message.sourceScope,
    channel: message.channel,
    notificationKey: message.notificationKey,
    sortOrder: message.sortOrder,
    enabled: message.enabled,
  };
}

export function toTriggerDto(
  trigger: TriggerWithMessages,
): AppointmentAutomatedMessageTriggerDto {
  return {
    id: trigger.id,
    kind: trigger.kind,
    offsetValue: trigger.offsetValue,
    offsetUnit: trigger.offsetUnit,
    sortOrder: trigger.sortOrder,
    messages: [...trigger.messages]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toMessageDto),
  };
}

export function toSettingsDto(
  settings: SettingsWithTriggers,
): AppointmentAutomatedMessageSettingsDto {
  return {
    id: settings.id,
    businessId: settings.businessId,
    eventType: settings.eventType,
    defaultStatus: settings.defaultStatus,
    triggers: [...settings.triggers]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toTriggerDto),
  };
}
