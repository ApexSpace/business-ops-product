import { Injectable, Logger } from '@nestjs/common';
import {
  AppointmentAutomatedMessageTriggerKind,
  AppointmentStatus,
} from '@prisma/client';
import { resolveBusinessTimezone } from '@app/common/utils/timezone.util';
import { PrismaService } from '@app/core/database/prisma.service';
import type { AppointmentWithRelations } from '../repositories/appointment.repository';
import { AppointmentAutomatedMessagesService } from '../automated-messages/services/appointment-automated-messages.service';
import { matchingBeforeStartMessages } from '../automated-messages/utils/message-resolver.util';
import { offsetToHours } from '../automated-messages/utils/source-scope.util';
import {
  DEFAULT_REMINDER_HOURS_BEFORE,
  parseCalendarNotificationSettings,
} from '../utils/calendar-notification-settings.util';
import { AppointmentNotificationService } from './appointment-notification.service';

const REMINDER_CRON_WINDOW_MS = 60 * 60 * 1000;
const MAX_LOOKAHEAD_HOURS = 14 * 24;

function readReminderOptIn(metadata: unknown): boolean | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).reminderOptIn;
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly appointmentAutomatedMessagesService: AppointmentAutomatedMessagesService,
  ) {}

  async processDueReminders(): Promise<void> {
    const now = new Date();
    const lookAheadEnd = new Date(
      now.getTime() + MAX_LOOKAHEAD_HOURS * 60 * 60 * 1000,
    );

    const appointments = await this.prisma.appointment.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [AppointmentStatus.UNCONFIRMED, AppointmentStatus.CONFIRMED],
        },
        startAt: {
          gt: now,
          lte: lookAheadEnd,
        },
        contact: {
          OR: [
            { email: { not: null } },
            { phoneNumber: { not: null } },
          ],
        },
      },
      include: {
        calendar: {
          select: {
            id: true,
            name: true,
            color: true,
            notificationSettings: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
            phoneNumber: true,
            phoneCountryCode: true,
            createdAt: true,
          },
        },
        service: { select: { id: true, name: true } },
        serviceLines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            service: {
              select: {
                id: true,
                name: true,
                durationMinutes: true,
                price: true,
                hasBufferTime: true,
                bufferBeforeMinutes: true,
                bufferAfterMinutes: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        invoices: {
          where: { deletedAt: null, kind: 'CHECKOUT' },
          select: { id: true, kind: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const businesses = await this.prisma.business.findMany({
      where: {
        id: { in: [...new Set(appointments.map((row) => row.businessId))] },
      },
      select: { id: true, timezone: true },
    });
    const timezoneByBusinessId = new Map(
      businesses.map((business) => [
        business.id,
        resolveBusinessTimezone(business.timezone),
      ]),
    );

    const bookedSettingsByBusiness = new Map<
      string,
      Awaited<
        ReturnType<AppointmentAutomatedMessagesService['findBookedSettings']>
      >
    >();

    let sent = 0;

    for (const appointment of appointments) {
      const businessTimezone =
        timezoneByBusinessId.get(appointment.businessId) ?? 'UTC';
      const reminderOptIn = readReminderOptIn(appointment.metadata);

      if (reminderOptIn === false) {
        continue;
      }

      if (!bookedSettingsByBusiness.has(appointment.businessId)) {
        bookedSettingsByBusiness.set(
          appointment.businessId,
          await this.appointmentAutomatedMessagesService.findBookedSettings(
            appointment.businessId,
          ),
        );
      }
      const bookedSettings = bookedSettingsByBusiness.get(
        appointment.businessId,
      );

      const beforeStart = bookedSettings
        ? matchingBeforeStartMessages(
            bookedSettings.triggers,
            appointment.source,
          ).filter((row) =>
            row.notificationKeys.includes('appointment.reminder'),
          )
        : [];

      const hasBeforeStartConfigured = Boolean(
        bookedSettings?.triggers.some(
          (trigger) =>
            trigger.kind === AppointmentAutomatedMessageTriggerKind.BEFORE_START,
        ),
      );

      if (hasBeforeStartConfigured) {
        for (const row of beforeStart) {
          const reminderHours = offsetToHours(row.offsetValue, row.offsetUnit);
          if (!this.isInWindow(now, appointment.startAt, reminderHours)) {
            continue;
          }

          try {
            await this.appointmentNotificationService.sendReminder(
              appointment.businessId,
              appointment as AppointmentWithRelations,
              reminderHours,
              businessTimezone,
              `appointment-reminder-${appointment.id}-${row.triggerId}`,
            );
            sent += 1;
          } catch (error) {
            this.logger.warn(
              `Reminder enqueue failed for appointment ${appointment.id}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
        continue;
      }

      // Fallback: calendar notificationSettings (legacy)
      if (!appointment.calendar) {
        if (
          reminderOptIn !== true ||
          (!appointment.contact?.email && !appointment.contact?.phoneNumber)
        ) {
          continue;
        }

        const reminderHours = DEFAULT_REMINDER_HOURS_BEFORE;
        if (!this.isInWindow(now, appointment.startAt, reminderHours)) {
          continue;
        }

        try {
          await this.appointmentNotificationService.sendReminder(
            appointment.businessId,
            appointment as AppointmentWithRelations,
            reminderHours,
            businessTimezone,
          );
          sent += 1;
        } catch (error) {
          this.logger.warn(
            `Reminder enqueue failed for appointment ${appointment.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        continue;
      }

      const settings = parseCalendarNotificationSettings(
        appointment.calendar.notificationSettings,
      );

      if (settings.reminderEnabled === false) {
        continue;
      }

      const reminderHours =
        settings.reminderHoursBefore ?? DEFAULT_REMINDER_HOURS_BEFORE;
      if (!this.isInWindow(now, appointment.startAt, reminderHours)) {
        continue;
      }

      try {
        await this.appointmentNotificationService.sendReminder(
          appointment.businessId,
          appointment as AppointmentWithRelations,
          reminderHours,
          businessTimezone,
        );
        sent += 1;
      } catch (error) {
        this.logger.warn(
          `Reminder enqueue failed for appointment ${appointment.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`Enqueued ${sent} appointment reminder email(s)`);
    }
  }

  private isInWindow(now: Date, startAt: Date, reminderHours: number): boolean {
    const reminderTarget = new Date(
      startAt.getTime() - reminderHours * 60 * 60 * 1000,
    );
    return (
      now >= reminderTarget &&
      now < new Date(reminderTarget.getTime() + REMINDER_CRON_WINDOW_MS)
    );
  }
}
