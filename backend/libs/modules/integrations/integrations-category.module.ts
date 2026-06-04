import { Module } from '@nestjs/common';
import { GoogleCalendarSyncModule } from './google-calendar-sync/google-calendar-sync.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [IntegrationsModule, GoogleCalendarSyncModule],
  exports: [IntegrationsModule, GoogleCalendarSyncModule],
})
export class IntegrationsCategoryModule {}
