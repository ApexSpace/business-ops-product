import { Injectable, Logger } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { resolveBusinessTimezone } from '@app/common/utils/timezone.util';
import { PrismaService } from '@app/core/database/prisma.service';
import type { AppointmentWithRelations } from '../repositories/appointment.repository';
import {
  DEFAULT_REMINDER_HOURS_BEFORE,
  parseCalendarNotificationSettings,
} from '../utils/calendar-notification-settings.util';
import { AppointmentNotificationService } from './appointment-notification.service';

const REMINDER_CRON_WINDOW_MS = 60 * 60 * 1000;

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
  ) {}

  async processDueReminders(): Promise<void> {
    const now = new Date();
    const maxLookAheadHours = 48;
    const lookAheadEnd = new Date(
      now.getTime() + maxLookAheadHours * 60 * 60 * 1000,
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
          email: { not: null },
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

    let sent = 0;

    for (const appointment of appointments) {
      const businessTimezone =
        timezoneByBusinessId.get(appointment.businessId) ?? 'UTC';
      const reminderOptIn = readReminderOptIn(appointment.metadata);

      if (!appointment.calendar) {
        if (reminderOptIn !== true || !appointment.contact?.email) {
          continue;
        }

        const reminderHours = DEFAULT_REMINDER_HOURS_BEFORE;
        const reminderTarget = new Date(
          appointment.startAt.getTime() - reminderHours * 60 * 60 * 1000,
        );

        if (
          now < reminderTarget ||
          now >= new Date(reminderTarget.getTime() + REMINDER_CRON_WINDOW_MS)
        ) {
          continue;
        }

        try {
          await this.appointmentNotificationService.sendReminder(
            appointment.businessId,
            appointment,
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

      if (reminderOptIn === false) {
        continue;
      }

      const reminderHours =
        settings.reminderHoursBefore ?? DEFAULT_REMINDER_HOURS_BEFORE;
      const reminderTarget = new Date(
        appointment.startAt.getTime() - reminderHours * 60 * 60 * 1000,
      );

      if (
        now < reminderTarget ||
        now >= new Date(reminderTarget.getTime() + REMINDER_CRON_WINDOW_MS)
      ) {
        continue;
      }

      try {
        await this.appointmentNotificationService.sendReminder(
          appointment.businessId,
          appointment,
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
}
