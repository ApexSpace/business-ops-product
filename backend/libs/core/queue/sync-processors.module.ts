import { Module, forwardRef } from '@nestjs/common';
import { GoogleCalendarSyncModule } from '@app/modules/integrations/google-calendar-sync/google-calendar-sync.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { AppointmentsModule } from '@app/modules/operations/appointments/appointments.module';
import { AppointmentGoogleSyncProcessor } from './processors/appointment-google-sync.processor';
import { CalendarSyncProcessor } from './processors/calendar-sync.processor';
import { CleanupAsyncJobsProcessor } from './processors/cleanup-async-jobs.processor';
import { CleanupOrphanFilesProcessor } from './processors/cleanup-orphan-files.processor';
import { CleanupWebhookEventsProcessor } from './processors/cleanup-webhook-events.processor';
import { IntegrationResourceSyncProcessor } from './processors/integration-resource-sync.processor';
import { MetaResourceSyncProcessor } from './processors/meta-resource-sync.processor';

@Module({
  imports: [
    GoogleCalendarSyncModule,
    IntegrationsModule,
    forwardRef(() => AppointmentsModule),
  ],
  providers: [
    CalendarSyncProcessor,
    AppointmentGoogleSyncProcessor,
    IntegrationResourceSyncProcessor,
    MetaResourceSyncProcessor,
    CleanupWebhookEventsProcessor,
    CleanupAsyncJobsProcessor,
    CleanupOrphanFilesProcessor,
  ],
  exports: [
    CalendarSyncProcessor,
    AppointmentGoogleSyncProcessor,
    IntegrationResourceSyncProcessor,
    MetaResourceSyncProcessor,
    CleanupWebhookEventsProcessor,
    CleanupAsyncJobsProcessor,
    CleanupOrphanFilesProcessor,
  ],
})
export class SyncProcessorsModule {}
