import { Injectable } from '@nestjs/common';
import {
  AppointmentAutomatedMessageEventType,
  AppointmentAutomatedMessageOffsetUnit,
  AppointmentAutomatedMessageSourceScope,
  AppointmentAutomatedMessageTriggerKind,
  AppointmentStatus,
  NotificationChannel,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  BOOKED_DEFAULT_STATUS,
  BOOKED_DEFAULT_TRIGGERS,
} from '../constants/defaults';

const settingsInclude = {
  triggers: {
    include: {
      messages: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.BusinessAppointmentAutomatedMessageSettingsInclude;

export type SettingsWithTree =
  Prisma.BusinessAppointmentAutomatedMessageSettingsGetPayload<{
    include: typeof settingsInclude;
  }>;

@Injectable()
export class AppointmentAutomatedMessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessAndEvent(
    businessId: string,
    eventType: AppointmentAutomatedMessageEventType,
  ): Promise<SettingsWithTree | null> {
    return this.prisma.businessAppointmentAutomatedMessageSettings.findUnique({
      where: {
        businessId_eventType: { businessId, eventType },
      },
      include: settingsInclude,
    });
  }

  async ensureSettings(
    businessId: string,
    eventType: AppointmentAutomatedMessageEventType,
  ): Promise<SettingsWithTree> {
    const existing = await this.findByBusinessAndEvent(businessId, eventType);
    if (existing) {
      return existing;
    }

    if (eventType === AppointmentAutomatedMessageEventType.BOOKED) {
      return this.prisma.businessAppointmentAutomatedMessageSettings.create({
        data: {
          businessId,
          eventType,
          defaultStatus: BOOKED_DEFAULT_STATUS,
          triggers: {
            create: BOOKED_DEFAULT_TRIGGERS.map((trigger) => ({
              kind: trigger.kind,
              offsetValue: trigger.offsetValue,
              offsetUnit: trigger.offsetUnit,
              sortOrder: trigger.sortOrder,
              messages: {
                create: trigger.messages.map((message) => ({
                  sourceScope: message.sourceScope,
                  channel: message.channel,
                  notificationKey: message.notificationKey,
                  sortOrder: message.sortOrder,
                  enabled: true,
                })),
              },
            })),
          },
        },
        include: settingsInclude,
      });
    }

    return this.prisma.businessAppointmentAutomatedMessageSettings.create({
      data: {
        businessId,
        eventType,
        defaultStatus: null,
        triggers: {
          create: [
            {
              kind: AppointmentAutomatedMessageTriggerKind.IMMEDIATE,
              sortOrder: 0,
              messages: { create: [] },
            },
          ],
        },
      },
      include: settingsInclude,
    });
  }

  updateSettings(
    id: string,
    data: { defaultStatus?: AppointmentStatus | null },
  ): Promise<SettingsWithTree> {
    return this.prisma.businessAppointmentAutomatedMessageSettings.update({
      where: { id },
      data,
      include: settingsInclude,
    });
  }

  findTriggerById(triggerId: string) {
    return this.prisma.appointmentAutomatedMessageTrigger.findFirst({
      where: { id: triggerId },
      include: {
        settings: true,
        messages: true,
      },
    });
  }

  findMessageById(messageId: string) {
    return this.prisma.appointmentAutomatedMessage.findFirst({
      where: { id: messageId },
      include: {
        trigger: {
          include: { settings: true },
        },
      },
    });
  }

  createTrigger(
    settingsId: string,
    data: {
      kind: AppointmentAutomatedMessageTriggerKind;
      offsetValue?: number | null;
      offsetUnit?: AppointmentAutomatedMessageOffsetUnit | null;
      sortOrder: number;
    },
  ) {
    return this.prisma.appointmentAutomatedMessageTrigger.create({
      data: {
        settingsId,
        kind: data.kind,
        offsetValue: data.offsetValue ?? null,
        offsetUnit: data.offsetUnit ?? null,
        sortOrder: data.sortOrder,
      },
      include: { messages: true },
    });
  }

  updateTrigger(
    triggerId: string,
    data: {
      offsetValue?: number;
      offsetUnit?: AppointmentAutomatedMessageOffsetUnit;
      sortOrder?: number;
    },
  ) {
    return this.prisma.appointmentAutomatedMessageTrigger.update({
      where: { id: triggerId },
      data,
      include: { messages: true },
    });
  }

  deleteTrigger(triggerId: string) {
    return this.prisma.appointmentAutomatedMessageTrigger.delete({
      where: { id: triggerId },
    });
  }

  createMessage(
    triggerId: string,
    data: {
      sourceScope: AppointmentAutomatedMessageSourceScope;
      channel: NotificationChannel;
      notificationKey: string;
      sortOrder: number;
      enabled: boolean;
    },
  ) {
    return this.prisma.appointmentAutomatedMessage.create({
      data: {
        triggerId,
        ...data,
      },
    });
  }

  updateMessage(
    messageId: string,
    data: Prisma.AppointmentAutomatedMessageUpdateInput,
  ) {
    return this.prisma.appointmentAutomatedMessage.update({
      where: { id: messageId },
      data,
    });
  }

  deleteMessage(messageId: string) {
    return this.prisma.appointmentAutomatedMessage.delete({
      where: { id: messageId },
    });
  }

  countTriggers(settingsId: string, kind?: AppointmentAutomatedMessageTriggerKind) {
    return this.prisma.appointmentAutomatedMessageTrigger.count({
      where: {
        settingsId,
        ...(kind ? { kind } : {}),
      },
    });
  }

  countMessages(triggerId: string) {
    return this.prisma.appointmentAutomatedMessage.count({
      where: { triggerId },
    });
  }
}
