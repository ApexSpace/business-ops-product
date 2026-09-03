import { api } from "@/lib/api/client";

export type AppointmentAutomatedMessageEventType =
  | "BOOKED"
  | "CANCELED"
  | "RESCHEDULED";

export type AppointmentAutomatedMessageTriggerKind =
  | "IMMEDIATE"
  | "BEFORE_START";

export type AppointmentAutomatedMessageOffsetUnit = "DAYS" | "HOURS";

export type AppointmentAutomatedMessageSourceScope =
  | "ALL"
  | "ONLINE"
  | "STAFF";

export type NotificationChannel = "EMAIL" | "SMS";

export interface AppointmentAutomatedMessage {
  id: string;
  sourceScope: AppointmentAutomatedMessageSourceScope;
  channel: NotificationChannel;
  notificationKey: string;
  sortOrder: number;
  enabled: boolean;
}

export interface AppointmentAutomatedMessageTrigger {
  id: string;
  kind: AppointmentAutomatedMessageTriggerKind;
  offsetValue: number | null;
  offsetUnit: AppointmentAutomatedMessageOffsetUnit | null;
  sortOrder: number;
  messages: AppointmentAutomatedMessage[];
}

export interface AppointmentAutomatedMessageSettings {
  id: string;
  businessId: string;
  eventType: AppointmentAutomatedMessageEventType;
  defaultStatus: "UNCONFIRMED" | "CONFIRMED" | null;
  triggers: AppointmentAutomatedMessageTrigger[];
}

export interface AppointmentAutomatedMessageCatalogItem {
  notificationKey: string;
  label: string;
  channels: NotificationChannel[];
}

export function getAppointmentAutomatedMessages(
  eventType: AppointmentAutomatedMessageEventType,
) {
  return api.get<AppointmentAutomatedMessageSettings>(
    `appointment-automated-messages/${eventType}`,
  );
}

export function updateAppointmentAutomatedMessageSettings(
  eventType: AppointmentAutomatedMessageEventType,
  body: { defaultStatus?: "UNCONFIRMED" | "CONFIRMED" },
) {
  return api.patch<AppointmentAutomatedMessageSettings>(
    `appointment-automated-messages/${eventType}`,
    body,
  );
}

export function getAppointmentAutomatedMessageCatalog(
  eventType: AppointmentAutomatedMessageEventType,
) {
  return api.get<AppointmentAutomatedMessageCatalogItem[]>(
    `appointment-automated-messages/${eventType}/message-catalog`,
  );
}

export function createAppointmentAutomatedMessageTrigger(
  eventType: AppointmentAutomatedMessageEventType,
  body: {
    kind: AppointmentAutomatedMessageTriggerKind;
    offsetValue?: number;
    offsetUnit?: AppointmentAutomatedMessageOffsetUnit;
    sortOrder?: number;
  },
) {
  return api.post<AppointmentAutomatedMessageTrigger>(
    `appointment-automated-messages/${eventType}/triggers`,
    body,
  );
}

export function updateAppointmentAutomatedMessageTrigger(
  triggerId: string,
  body: {
    offsetValue?: number;
    offsetUnit?: AppointmentAutomatedMessageOffsetUnit;
    sortOrder?: number;
  },
) {
  return api.patch<AppointmentAutomatedMessageTrigger>(
    `appointment-automated-messages/triggers/${triggerId}`,
    body,
  );
}

export function deleteAppointmentAutomatedMessageTrigger(triggerId: string) {
  return api.delete<void>(
    `appointment-automated-messages/triggers/${triggerId}`,
    { searchParams: { confirm: true } },
  );
}

export function createAppointmentAutomatedMessage(
  triggerId: string,
  body: {
    sourceScope: AppointmentAutomatedMessageSourceScope;
    channel: NotificationChannel;
    notificationKey: string;
    sortOrder?: number;
    enabled?: boolean;
  },
) {
  return api.post<AppointmentAutomatedMessage>(
    `appointment-automated-messages/triggers/${triggerId}/messages`,
    body,
  );
}

export function updateAppointmentAutomatedMessage(
  messageId: string,
  body: Partial<{
    sourceScope: AppointmentAutomatedMessageSourceScope;
    channel: NotificationChannel;
    notificationKey: string;
    sortOrder: number;
    enabled: boolean;
  }>,
) {
  return api.patch<AppointmentAutomatedMessage>(
    `appointment-automated-messages/messages/${messageId}`,
    body,
  );
}

export function deleteAppointmentAutomatedMessage(messageId: string) {
  return api.delete<void>(
    `appointment-automated-messages/messages/${messageId}`,
    { searchParams: { confirm: true } },
  );
}
