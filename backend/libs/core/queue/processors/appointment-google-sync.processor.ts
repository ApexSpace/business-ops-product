import { Injectable, Logger } from '@nestjs/common';
import { AsyncJobRepository } from '@app/core/jobs/async-job.repository';
import type { AppointmentGoogleSyncJobPayload } from '../queue.types';
import { GoogleCalendarSyncService } from '@app/modules/integrations/google-calendar-sync/google-calendar-sync.service';
import { AppointmentRepository } from '@app/modules/operations/appointments/repositories/appointment.repository';
import { runAsyncJob } from './async-job-processor.util';

@Injectable()
export class AppointmentGoogleSyncProcessor {
  private readonly logger = new Logger(AppointmentGoogleSyncProcessor.name);

  constructor(
    private readonly googleCalendarSyncService: GoogleCalendarSyncService,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly asyncJobRepository: AsyncJobRepository,
  ) {}

  async process(payload: AppointmentGoogleSyncJobPayload): Promise<void> {
    await runAsyncJob(
      { logger: this.logger, asyncJobRepository: this.asyncJobRepository },
      payload,
      async () => {
        if (payload.operation === 'delete') {
          const snapshot =
            payload.calendarId != null
              ? {
                  id: payload.appointmentId,
                  calendarId: payload.calendarId,
                  externalEventId: payload.externalEventId ?? null,
                  externalProvider: payload.externalProvider ?? null,
                }
              : await this.appointmentRepository.findById(
                  payload.businessId,
                  payload.appointmentId,
                );
          if (snapshot?.calendarId) {
            await this.googleCalendarSyncService.afterAppointmentDeleted(
              payload.businessId,
              {
                id: snapshot.id,
                calendarId: snapshot.calendarId,
                externalEventId: snapshot.externalEventId ?? null,
                externalProvider: snapshot.externalProvider ?? null,
              },
              payload.actorUserId,
            );
          }
          return { deleted: true };
        }

        const result =
          await this.googleCalendarSyncService.syncAppointmentToGoogle(
            payload.businessId,
            payload.appointmentId,
            payload.actorUserId,
          );
        return result;
      },
    );
  }
}
