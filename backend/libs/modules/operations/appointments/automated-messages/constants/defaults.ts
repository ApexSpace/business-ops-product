import {
  AppointmentAutomatedMessageEventType,
  AppointmentAutomatedMessageOffsetUnit,
  AppointmentAutomatedMessageSourceScope,
  AppointmentAutomatedMessageTriggerKind,
  AppointmentStatus,
  NotificationChannel,
} from '@prisma/client';

export const BOOKED_DEFAULT_STATUS = AppointmentStatus.CONFIRMED;

export const BOOKED_DEFAULT_TRIGGERS: Array<{
  kind: AppointmentAutomatedMessageTriggerKind;
  offsetValue: number | null;
  offsetUnit: AppointmentAutomatedMessageOffsetUnit | null;
  sortOrder: number;
  messages: Array<{
    sourceScope: AppointmentAutomatedMessageSourceScope;
    channel: NotificationChannel;
    notificationKey: string;
    sortOrder: number;
  }>;
}> = [
  {
    kind: AppointmentAutomatedMessageTriggerKind.IMMEDIATE,
    offsetValue: null,
    offsetUnit: null,
    sortOrder: 0,
    messages: [
      {
        sourceScope: AppointmentAutomatedMessageSourceScope.ALL,
        channel: NotificationChannel.EMAIL,
        notificationKey: 'appointment.confirmation',
        sortOrder: 0,
      },
    ],
  },
  {
    kind: AppointmentAutomatedMessageTriggerKind.BEFORE_START,
    offsetValue: 2,
    offsetUnit: AppointmentAutomatedMessageOffsetUnit.DAYS,
    sortOrder: 1,
    messages: [
      {
        sourceScope: AppointmentAutomatedMessageSourceScope.ALL,
        channel: NotificationChannel.EMAIL,
        notificationKey: 'appointment.reminder',
        sortOrder: 0,
      },
    ],
  },
  {
    kind: AppointmentAutomatedMessageTriggerKind.BEFORE_START,
    offsetValue: 1,
    offsetUnit: AppointmentAutomatedMessageOffsetUnit.DAYS,
    sortOrder: 2,
    messages: [
      {
        sourceScope: AppointmentAutomatedMessageSourceScope.ALL,
        channel: NotificationChannel.EMAIL,
        notificationKey: 'appointment.reminder',
        sortOrder: 0,
      },
    ],
  },
  {
    kind: AppointmentAutomatedMessageTriggerKind.BEFORE_START,
    offsetValue: 3,
    offsetUnit: AppointmentAutomatedMessageOffsetUnit.HOURS,
    sortOrder: 3,
    messages: [
      {
        sourceScope: AppointmentAutomatedMessageSourceScope.ALL,
        channel: NotificationChannel.EMAIL,
        notificationKey: 'appointment.reminder',
        sortOrder: 0,
      },
    ],
  },
];

export function parseEventType(
  value: string,
): AppointmentAutomatedMessageEventType | null {
  const upper = value.toUpperCase();
  if (
    upper === AppointmentAutomatedMessageEventType.BOOKED ||
    upper === AppointmentAutomatedMessageEventType.CANCELED ||
    upper === AppointmentAutomatedMessageEventType.RESCHEDULED
  ) {
    return upper as AppointmentAutomatedMessageEventType;
  }
  return null;
}

export const CONFIRMATION_REQUEST_KEYS = new Set([
  'appointment.confirmation_request',
]);

export const BOOKED_CATALOG = [
  {
    notificationKey: 'appointment.confirmation',
    label: 'Email / text booking confirmation to client',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS] as const,
  },
  {
    notificationKey: 'appointment.reminder',
    label: 'Email / text reminder to client',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS] as const,
  },
] as const;
