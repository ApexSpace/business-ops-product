import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { AppointmentsModule } from '@app/modules/operations/appointments/appointments.module';
import { CalendarsModule } from '@app/modules/operations/calendars/calendars.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { GoogleCalendarApiClient } from './google-calendar-api.client';
import { GoogleCalendarSyncController } from './google-calendar-sync.controller';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

@Module({
  imports: [
    AuditModule,
    IntegrationsModule,
    CalendarsModule,
    ContactsModule,
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [GoogleCalendarSyncController],
  providers: [GoogleCalendarApiClient, GoogleCalendarSyncService],
  exports: [GoogleCalendarSyncService],
})
export class GoogleCalendarSyncModule {}
