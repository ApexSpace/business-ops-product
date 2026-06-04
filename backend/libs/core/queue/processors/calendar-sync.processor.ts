import { Injectable, Logger } from '@nestjs/common';
import { AsyncJobRepository } from '@app/core/jobs/async-job.repository';
import type { CalendarSyncJobPayload } from '../queue.types';
import { GoogleCalendarSyncService } from '@app/modules/integrations/google-calendar-sync/google-calendar-sync.service';
import { runAsyncJob } from './async-job-processor.util';

@Injectable()
export class CalendarSyncProcessor {
  private readonly logger = new Logger(CalendarSyncProcessor.name);

  constructor(
    private readonly googleCalendarSyncService: GoogleCalendarSyncService,
    private readonly asyncJobRepository: AsyncJobRepository,
  ) {}

  async process(payload: CalendarSyncJobPayload): Promise<void> {
    await runAsyncJob(
      { logger: this.logger, asyncJobRepository: this.asyncJobRepository },
      payload,
      async () => {
        const summary = await this.googleCalendarSyncService.syncCalendar(
          payload.businessId,
          payload.calendarId,
          payload.actorUserId,
        );
        return summary as unknown as Record<string, unknown>;
      },
    );
  }
}
