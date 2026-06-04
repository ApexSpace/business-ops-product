import { Module } from '@nestjs/common';
import { GoogleCalendarSyncModule } from '@app/modules/integrations/google-calendar-sync/google-calendar-sync.module';

@Module({
  imports: [GoogleCalendarSyncModule],
})
export class OperationsWorkerModule {}
