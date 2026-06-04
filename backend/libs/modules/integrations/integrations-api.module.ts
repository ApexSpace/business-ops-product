import { Module } from '@nestjs/common';
import { IntegrationsModule } from './integrations/integrations.module';
import { GoogleCalendarSyncModule } from './google-calendar-sync/google-calendar-sync.module';

@Module({
  imports: [IntegrationsModule, GoogleCalendarSyncModule],
})
export class IntegrationsApiModule {}
