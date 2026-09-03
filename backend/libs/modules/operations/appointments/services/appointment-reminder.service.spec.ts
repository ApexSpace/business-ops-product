import {
  AppointmentAutomatedMessageOffsetUnit,
  AppointmentAutomatedMessageSourceScope,
  AppointmentAutomatedMessageTriggerKind,
  AppointmentSource,
  AppointmentStatus,
} from '@prisma/client';
import { AppointmentReminderService } from './appointment-reminder.service';

describe('AppointmentReminderService', () => {
  const now = new Date('2026-06-10T12:00:00.000Z');

  function hoursFromNow(hours: number) {
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  function createService(overrides?: {
    appointments?: unknown[];
    bookedSettings?: unknown;
  }) {
    const prisma = {
      appointment: {
        findMany: jest
          .fn()
          .mockResolvedValue(overrides?.appointments ?? []),
      },
      business: {
        findMany: jest.fn().mockResolvedValue([{ id: 'biz-1', timezone: 'UTC' }]),
      },
    };
    const appointmentNotificationService = {
      sendReminder: jest.fn().mockResolvedValue(undefined),
    };
    const appointmentAutomatedMessagesService = {
      findBookedSettings: jest
        .fn()
        .mockResolvedValue(overrides?.bookedSettings ?? null),
    };

    const service = new AppointmentReminderService(
      prisma as never,
      appointmentNotificationService as never,
      appointmentAutomatedMessagesService as never,
    );

    return {
      service,
      prisma,
      appointmentNotificationService,
      appointmentAutomatedMessagesService,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends multi-offset BOOKED reminders with distinct trigger idempotency keys', async () => {
    const appointment = {
      id: 'appt-1',
      businessId: 'biz-1',
      source: AppointmentSource.INTERNAL,
      status: AppointmentStatus.CONFIRMED,
      startAt: hoursFromNow(48),
      metadata: null,
      calendar: {
        id: 'cal-1',
        name: 'Main',
        color: null,
        notificationSettings: { reminderEnabled: true, reminderHoursBefore: 24 },
      },
      contact: {
        id: 'c1',
        email: 'jane@example.com',
        phoneNumber: '5551234567',
        phoneCountryCode: '+1',
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: null,
        createdAt: now,
      },
      service: null,
      serviceLines: [],
      assignedTo: null,
      createdBy: null,
      invoices: [],
    };

    const bookedSettings = {
      id: 's1',
      businessId: 'biz-1',
      eventType: 'BOOKED',
      defaultStatus: AppointmentStatus.CONFIRMED,
      triggers: [
        {
          id: 't-2d',
          kind: AppointmentAutomatedMessageTriggerKind.BEFORE_START,
          offsetValue: 2,
          offsetUnit: AppointmentAutomatedMessageOffsetUnit.DAYS,
          sortOrder: 0,
          messages: [
            {
              id: 'm1',
              enabled: true,
              sourceScope: AppointmentAutomatedMessageSourceScope.ALL,
              notificationKey: 'appointment.reminder',
              channel: 'EMAIL',
              sortOrder: 0,
            },
          ],
        },
        {
          id: 't-1d',
          kind: AppointmentAutomatedMessageTriggerKind.BEFORE_START,
          offsetValue: 1,
          offsetUnit: AppointmentAutomatedMessageOffsetUnit.DAYS,
          sortOrder: 1,
          messages: [
            {
              id: 'm2',
              enabled: true,
              sourceScope: AppointmentAutomatedMessageSourceScope.ALL,
              notificationKey: 'appointment.reminder',
              channel: 'EMAIL',
              sortOrder: 0,
            },
          ],
        },
      ],
    };

    const { service, appointmentNotificationService } = createService({
      appointments: [appointment],
      bookedSettings,
    });

    await service.processDueReminders();

    expect(appointmentNotificationService.sendReminder).toHaveBeenCalledTimes(1);
    expect(appointmentNotificationService.sendReminder).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ id: 'appt-1' }),
      48,
      'UTC',
      'appointment-reminder-appt-1-t-2d',
    );
  });

  it('falls back to calendar reminderHoursBefore when no BEFORE_START triggers', async () => {
    const appointment = {
      id: 'appt-2',
      businessId: 'biz-1',
      source: AppointmentSource.INTERNAL,
      status: AppointmentStatus.CONFIRMED,
      startAt: hoursFromNow(24),
      metadata: null,
      calendar: {
        id: 'cal-1',
        name: 'Main',
        color: null,
        notificationSettings: {
          reminderEnabled: true,
          reminderHoursBefore: 24,
        },
      },
      contact: {
        id: 'c1',
        email: 'jane@example.com',
        phoneNumber: null,
        phoneCountryCode: null,
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: null,
        createdAt: now,
      },
      service: null,
      serviceLines: [],
      assignedTo: null,
      createdBy: null,
      invoices: [],
    };

    const { service, appointmentNotificationService } = createService({
      appointments: [appointment],
      bookedSettings: {
        id: 's1',
        businessId: 'biz-1',
        eventType: 'BOOKED',
        defaultStatus: AppointmentStatus.CONFIRMED,
        triggers: [
          {
            id: 't-imm',
            kind: AppointmentAutomatedMessageTriggerKind.IMMEDIATE,
            offsetValue: null,
            offsetUnit: null,
            sortOrder: 0,
            messages: [],
          },
        ],
      },
    });

    await service.processDueReminders();

    expect(appointmentNotificationService.sendReminder).toHaveBeenCalledTimes(1);
    expect(appointmentNotificationService.sendReminder).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ id: 'appt-2' }),
      24,
      'UTC',
    );
  });
});
