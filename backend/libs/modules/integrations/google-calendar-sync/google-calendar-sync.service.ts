import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AppointmentSource,
  AppointmentStatus,
  Calendar,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { AppointmentRepository } from '@app/modules/operations/appointments/repositories/appointment.repository';
import { CalendarRepository } from '@app/modules/operations/calendars/repositories/calendar.repository';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import { GoogleTokenService } from '@app/modules/integrations/integrations/services/google-token.service';
import { GoogleCalendarApiClient } from './google-calendar-api.client';
import {
  APPOINTMENT_EXTERNAL_PROVIDER,
  GOOGLE_CALENDAR_PROVIDER_KEY,
  GOOGLE_IMPORT_CONTACT_DISPLAY_NAME,
} from './google-calendar-sync.constants';
import {
  canPullFromGoogle,
  canPushToGoogle,
  mergeGoogleSyncSettings,
  parseGoogleSyncSettings,
} from './google-calendar-sync-settings.util';
import type {
  GoogleCalendarEvent,
  GoogleCalendarSyncSettings,
  GoogleCalendarSyncStatusResponse,
  GoogleCalendarSyncSummary,
} from './google-calendar-sync.types';

interface SyncContext {
  calendar: Calendar;
  settings: GoogleCalendarSyncSettings;
  externalCalendarId: string;
  businessIntegrationId: string;
  timezone: string;
}

@Injectable()
export class GoogleCalendarSyncService {
  constructor(
    private readonly googleCalendarApiClient: GoogleCalendarApiClient,
    private readonly googleTokenService: GoogleTokenService,
    private readonly calendarRepository: CalendarRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly contactRepository: ContactRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly auditService: AuditService,
  ) {}

  async getSyncStatus(
    businessId: string,
    calendarId: string,
  ): Promise<GoogleCalendarSyncStatusResponse> {
    const calendar = await this.requireCalendar(businessId, calendarId);
    const settings = parseGoogleSyncSettings(calendar.googleSyncSettings);
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        GOOGLE_CALENDAR_PROVIDER_KEY,
      );

    let externalCalendarId = settings.externalCalendarId ?? null;
    if (!externalCalendarId && settings.integrationResourceId) {
      const resource = await this.integrationResourceRepository.findByIdAndBusiness(
        settings.integrationResourceId,
        businessId,
      );
      externalCalendarId = resource?.externalId ?? null;
    }

    const direction = settings.syncDirection;
    const enabled = settings.enabled && direction !== 'NONE';

    return {
      enabled,
      syncDirection: direction,
      syncStatus: settings.syncStatus ?? (enabled ? 'ACTIVE' : 'DISABLED'),
      lastSyncedAt: settings.lastSyncedAt ?? null,
      lastError: settings.lastError ?? null,
      externalCalendarId,
      integrationResourceId: settings.integrationResourceId ?? null,
      connectedAccountEmail: integration?.connectedAccountEmail ?? null,
      canSync:
        enabled &&
        Boolean(externalCalendarId) &&
        integration?.status === 'CONNECTED' &&
        (canPullFromGoogle(direction) || canPushToGoogle(direction)),
      canPull: enabled && canPullFromGoogle(direction),
      canPush: enabled && canPushToGoogle(direction),
    };
  }

  async syncCalendar(
    businessId: string,
    calendarId: string,
    actorUserId: string,
  ): Promise<GoogleCalendarSyncSummary> {
    const context = await this.resolveContext(businessId, calendarId);
    const summary: GoogleCalendarSyncSummary = {
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      pushed: 0,
      errors: [],
    };

    await this.auditService.log({
      actorUserId,
      businessId,
      action: 'calendar.google_sync.started',
      entityType: 'Calendar',
      entityId: calendarId,
    });

    try {
      if (canPullFromGoogle(context.settings.syncDirection)) {
        const pull = await this.syncGoogleToInternal(
          businessId,
          calendarId,
          actorUserId,
          context,
        );
        summary.created += pull.created;
        summary.updated += pull.updated;
        summary.skipped += pull.skipped;
        summary.errors.push(...pull.errors);
      }

      if (canPushToGoogle(context.settings.syncDirection)) {
        const push = await this.pushAllInternalToGoogle(
          businessId,
          calendarId,
          context,
        );
        summary.pushed += push.pushed;
        summary.errors.push(...push.errors);
      }

      await this.updateSyncSettings(businessId, calendarId, {
        lastSyncedAt: new Date().toISOString(),
        syncStatus: summary.errors.length > 0 ? 'ERROR' : 'ACTIVE',
        lastError:
          summary.errors.length > 0 ? summary.errors[0] ?? 'Sync had errors' : null,
      });

      await this.auditService.log({
        actorUserId,
        businessId,
        action: 'calendar.google_sync.completed',
        entityType: 'Calendar',
        entityId: calendarId,
        metadata: summary as unknown as Record<string, unknown>,
      });

      return summary;
    } catch (error) {
      const message = this.errorMessage(error);
      await this.updateSyncSettings(businessId, calendarId, {
        syncStatus: 'ERROR',
        lastError: message,
      });
      await this.auditService.log({
        actorUserId,
        businessId,
        action: 'calendar.google_sync.failed',
        entityType: 'Calendar',
        entityId: calendarId,
        metadata: { error: message },
      });
      throw error;
    }
  }

  async syncAppointmentToGoogle(
    businessId: string,
    appointmentId: string,
    actorUserId: string,
  ): Promise<{ synced: boolean; warning?: string }> {
    try {
      const appointment = await this.appointmentRepository.findById(
        businessId,
        appointmentId,
      );
      if (!appointment) {
        return { synced: false };
      }

      const context = await this.resolveContext(
        businessId,
        appointment.calendarId,
        { requirePush: true },
      );

      if (appointment.status === AppointmentStatus.CANCELLED) {
        await this.deleteGoogleEventForAppointment(businessId, appointment, context);
        return { synced: true };
      }

      const accessToken = await this.googleTokenService.getAccessToken(
        businessId,
        GOOGLE_CALENDAR_PROVIDER_KEY,
      );

      const payload = this.buildGoogleEventPayload(
        appointment,
        context,
        businessId,
      );

      let googleEventId = appointment.externalEventId;

      if (googleEventId) {
        await this.googleCalendarApiClient.updateEvent(
          accessToken,
          context.externalCalendarId,
          googleEventId,
          payload,
        );
      } else {
        const created = await this.googleCalendarApiClient.createEvent(
          accessToken,
          context.externalCalendarId,
          payload,
        );
        googleEventId = created.id;
        await this.appointmentRepository.update(appointment.id, {
          externalEventId: googleEventId,
          externalProvider: APPOINTMENT_EXTERNAL_PROVIDER,
        });
      }

      await this.auditService.log({
        actorUserId,
        businessId,
        action: 'appointment.synced_to_google',
        entityType: 'Appointment',
        entityId: appointmentId,
        metadata: { googleEventId },
      });

      return { synced: true };
    } catch (error) {
      const message = this.errorMessage(error);
      await this.auditService.log({
        actorUserId,
        businessId,
        action: 'appointment.google_sync_failed',
        entityType: 'Appointment',
        entityId: appointmentId,
        metadata: { error: message },
      });
      return { synced: false, warning: message };
    }
  }

  async afterAppointmentDeleted(
    businessId: string,
    appointment: {
      id: string;
      calendarId: string;
      externalEventId: string | null;
      externalProvider: string | null;
    },
    actorUserId: string,
  ): Promise<void> {
    try {
      const context = await this.resolveContext(
        businessId,
        appointment.calendarId,
        { requirePush: true },
      );
      await this.deleteGoogleEventForAppointment(
        businessId,
        appointment,
        context,
      );
    } catch (error) {
      await this.auditService.log({
        actorUserId,
        businessId,
        action: 'appointment.google_sync_failed',
        entityType: 'Appointment',
        entityId: appointment.id,
        metadata: { error: this.errorMessage(error), phase: 'delete' },
      });
    }
  }

  private async deleteGoogleEventForAppointment(
    businessId: string,
    appointment: {
      externalEventId: string | null;
      externalProvider: string | null;
    },
    context: SyncContext,
  ): Promise<void> {
    if (
      !appointment.externalEventId ||
      appointment.externalProvider !== APPOINTMENT_EXTERNAL_PROVIDER
    ) {
      return;
    }

    const accessToken = await this.googleTokenService.getAccessToken(
      businessId,
      GOOGLE_CALENDAR_PROVIDER_KEY,
    );

    await this.googleCalendarApiClient.deleteEvent(
      accessToken,
      context.externalCalendarId,
      appointment.externalEventId,
    );
  }

  private async syncGoogleToInternal(
    businessId: string,
    calendarId: string,
    actorUserId: string,
    context: SyncContext,
  ): Promise<Omit<GoogleCalendarSyncSummary, 'pushed' | 'deleted'>> {
    const summary = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
    const accessToken = await this.googleTokenService.getAccessToken(
      businessId,
      GOOGLE_CALENDAR_PROVIDER_KEY,
    );

    const now = new Date();
    const timeMin = new Date(now);
    timeMin.setDate(timeMin.getDate() - 30);
    const timeMax = new Date(now);
    timeMax.setDate(timeMax.getDate() + 90);

    const importContactId = await this.getOrCreateImportContact(
      businessId,
      actorUserId,
    );

    let pageToken: string | undefined;
    do {
      const page = await this.googleCalendarApiClient.listEvents(
        accessToken,
        context.externalCalendarId,
        {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          pageToken,
        },
      );

      for (const event of page.items ?? []) {
        try {
          const result = await this.importGoogleEvent(
            businessId,
            calendarId,
            event,
            importContactId,
            actorUserId,
            context,
          );
          if (result === 'created') summary.created += 1;
          else if (result === 'updated') summary.updated += 1;
          else summary.skipped += 1;
        } catch (error) {
          summary.errors.push(
            `Event ${event.id}: ${this.errorMessage(error)}`,
          );
        }
      }

      pageToken = page.nextPageToken;
    } while (pageToken);

    return summary;
  }

  private async importGoogleEvent(
    businessId: string,
    calendarId: string,
    event: GoogleCalendarEvent,
    importContactId: string,
    actorUserId: string,
    context: SyncContext,
  ): Promise<'created' | 'updated' | 'skipped'> {
    if (event.status === 'cancelled') {
      const internalId = event.extendedProperties?.private?.internalAppointmentId;
      if (internalId) {
        const existing = await this.appointmentRepository.findById(
          businessId,
          internalId,
        );
        if (existing) {
          await this.appointmentRepository.update(existing.id, {
            status: AppointmentStatus.CANCELLED,
          });
          return 'updated';
        }
      }
      return 'skipped';
    }

    if (event.start?.date && !event.start?.dateTime) {
      return 'skipped';
    }

    const startAt = this.parseGoogleDateTime(event.start);
    const endAt = this.parseGoogleDateTime(event.end);
    if (!startAt || !endAt || endAt <= startAt) {
      return 'skipped';
    }

    const internalId = event.extendedProperties?.private?.internalAppointmentId;
    let existing =
      internalId
        ? await this.appointmentRepository.findById(businessId, internalId)
        : null;

    if (!existing && event.id) {
      existing = await this.appointmentRepository.findByExternalEvent(
        businessId,
        calendarId,
        APPOINTMENT_EXTERNAL_PROVIDER,
        event.id,
      );
    }

    const googleUpdated = event.updated ? new Date(event.updated) : null;

    if (existing) {
      if (
        googleUpdated &&
        existing.updatedAt > googleUpdated &&
        context.settings.syncDirection === 'TWO_WAY'
      ) {
        return 'skipped';
      }

      await this.appointmentRepository.update(existing.id, {
        title: event.summary?.trim() || existing.title,
        description: event.description?.trim() || null,
        startAt,
        endAt,
        externalEventId: event.id,
        externalProvider: APPOINTMENT_EXTERNAL_PROVIDER,
      });
      return 'updated';
    }

    const created = await this.appointmentRepository.create(businessId, {
      calendarId,
      contactId: importContactId,
      title: event.summary?.trim() || 'Google Calendar Event',
      description: event.description?.trim() || null,
      startAt,
      endAt,
      status: AppointmentStatus.SCHEDULED,
      source: AppointmentSource.GOOGLE_SYNC,
      externalEventId: event.id,
      externalProvider: APPOINTMENT_EXTERNAL_PROVIDER,
      createdById: actorUserId,
    });

    await this.auditService.log({
      actorUserId,
      businessId,
      action: 'appointment.imported_from_google',
      entityType: 'Appointment',
      entityId: created.id,
      metadata: { googleEventId: event.id },
    });

    return 'created';
  }

  private async pushAllInternalToGoogle(
    businessId: string,
    calendarId: string,
    context: SyncContext,
  ): Promise<{ pushed: number; errors: string[] }> {
    const result = { pushed: 0, errors: [] as string[] };
    const now = new Date();
    const startFrom = new Date(now);
    startFrom.setDate(startFrom.getDate() - 30);
    const startTo = new Date(now);
    startTo.setDate(startTo.getDate() + 90);

    const { items } = await this.appointmentRepository.findMany(businessId, {
      skip: 0,
      take: 500,
      calendarId,
      startFrom,
      startTo,
    });

    for (const appointment of items) {
      if (appointment.status === AppointmentStatus.CANCELLED) {
        continue;
      }
      try {
        const accessToken = await this.googleTokenService.getAccessToken(
          businessId,
          GOOGLE_CALENDAR_PROVIDER_KEY,
        );
        const payload = this.buildGoogleEventPayload(
          appointment,
          context,
          businessId,
        );

        if (appointment.externalEventId) {
          await this.googleCalendarApiClient.updateEvent(
            accessToken,
            context.externalCalendarId,
            appointment.externalEventId,
            payload,
          );
        } else {
          const created = await this.googleCalendarApiClient.createEvent(
            accessToken,
            context.externalCalendarId,
            payload,
          );
          await this.appointmentRepository.update(appointment.id, {
            externalEventId: created.id,
            externalProvider: APPOINTMENT_EXTERNAL_PROVIDER,
          });
        }
        result.pushed += 1;
      } catch (error) {
        result.errors.push(
          `Appointment ${appointment.id}: ${this.errorMessage(error)}`,
        );
      }
    }

    return result;
  }

  private buildGoogleEventPayload(
    appointment: {
      id: string;
      calendarId: string;
      title: string;
      description: string | null;
      notes: string | null;
      startAt: Date;
      endAt: Date;
      contact: {
        firstName: string | null;
        lastName: string | null;
        displayName: string | null;
        email: string | null;
      };
      service: { name: string } | null;
    },
    context: SyncContext,
    businessId: string,
  ) {
    const contactName =
      appointment.contact.displayName?.trim() ||
      [appointment.contact.firstName, appointment.contact.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      appointment.contact.email ||
      'Contact';

    const descriptionParts = [
      appointment.description,
      `Contact: ${contactName}`,
      appointment.service ? `Service: ${appointment.service.name}` : null,
      appointment.notes ? `Notes: ${appointment.notes}` : null,
      `Internal appointment ID: ${appointment.id}`,
    ].filter(Boolean);

    return {
      summary: appointment.title,
      description: descriptionParts.join('\n'),
      start: {
        dateTime: appointment.startAt.toISOString(),
        timeZone: context.timezone,
      },
      end: {
        dateTime: appointment.endAt.toISOString(),
        timeZone: context.timezone,
      },
      extendedProperties: {
        private: {
          internalAppointmentId: appointment.id,
          businessId,
          calendarId: appointment.calendarId,
        },
      },
    };
  }

  private parseGoogleDateTime(
    value?: { dateTime?: string; date?: string; timeZone?: string },
  ): Date | null {
    if (!value) return null;
    if (value.dateTime) {
      return new Date(value.dateTime);
    }
    if (value.date) {
      return new Date(`${value.date}T00:00:00.000Z`);
    }
    return null;
  }

  private async getOrCreateImportContact(
    businessId: string,
    actorUserId: string,
  ): Promise<string> {
    const { items } = await this.contactRepository.findMany(businessId, {
      skip: 0,
      take: 50,
      search: GOOGLE_IMPORT_CONTACT_DISPLAY_NAME,
    });

    const existing = items.find(
      (c) => c.displayName === GOOGLE_IMPORT_CONTACT_DISPLAY_NAME,
    );
    if (existing) {
      return existing.id;
    }

    const created = await this.contactRepository.create(
      businessId,
      {
        displayName: GOOGLE_IMPORT_CONTACT_DISPLAY_NAME,
        firstName: 'Google',
        lastName: 'Import',
      },
      actorUserId,
    );
    return created.id;
  }

  private async resolveContext(
    businessId: string,
    calendarId: string,
    options?: { requirePush?: boolean; requirePull?: boolean },
  ): Promise<SyncContext> {
    const calendar = await this.requireCalendar(businessId, calendarId);
    const settings = parseGoogleSyncSettings(calendar.googleSyncSettings);

    if (!settings.enabled || settings.syncDirection === 'NONE') {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Google Calendar sync is not enabled for this calendar',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (options?.requirePush && !canPushToGoogle(settings.syncDirection)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This calendar is not configured to push appointments to Google',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (options?.requirePull && !canPullFromGoogle(settings.syncDirection)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This calendar is not configured to pull appointments from Google',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!settings.integrationResourceId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Select a Google Calendar resource before enabling sync',
        HttpStatus.BAD_REQUEST,
      );
    }

    const resource = await this.integrationResourceRepository.findByIdAndBusiness(
      settings.integrationResourceId,
      businessId,
    );
    if (!resource || resource.providerKey !== GOOGLE_CALENDAR_PROVIDER_KEY) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Selected Google Calendar resource was not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        GOOGLE_CALENDAR_PROVIDER_KEY,
      );
    if (!integration || integration.status !== 'CONNECTED') {
      throw new AppException(
        ErrorCode.INTEGRATION_NOT_FOUND,
        'Google Calendar integration is not connected',
        HttpStatus.BAD_REQUEST,
      );
    }

    const externalCalendarId =
      settings.externalCalendarId ?? resource.externalId;

    await this.updateSyncSettings(businessId, calendarId, {
      businessIntegrationId: integration.id,
      integrationResourceId: resource.id,
      externalCalendarId,
      providerKey: GOOGLE_CALENDAR_PROVIDER_KEY,
    });

    return {
      calendar,
      settings: {
        ...settings,
        externalCalendarId,
        businessIntegrationId: integration.id,
      },
      externalCalendarId,
      businessIntegrationId: integration.id,
      timezone: calendar.timezone || 'UTC',
    };
  }

  private async updateSyncSettings(
    businessId: string,
    calendarId: string,
    patch: Partial<GoogleCalendarSyncSettings>,
  ): Promise<void> {
    const calendar = await this.requireCalendar(businessId, calendarId);
    const merged = mergeGoogleSyncSettings(calendar.googleSyncSettings, patch);
    await this.calendarRepository.update(businessId, calendarId, {
      googleSyncSettings: merged as unknown as Prisma.InputJsonValue,
    });
  }

  private async requireCalendar(
    businessId: string,
    calendarId: string,
  ): Promise<Calendar> {
    const calendar = await this.calendarRepository.findById(businessId, calendarId);
    if (!calendar) {
      throw new AppException(
        ErrorCode.CALENDAR_NOT_FOUND,
        'Calendar not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return calendar;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof AppException) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown sync error';
  }
}
