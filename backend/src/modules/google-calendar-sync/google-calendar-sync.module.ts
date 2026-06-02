import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { CalendarsModule } from '../calendars/calendars.module';
import { ContactsModule } from '../contacts/contacts.module';
import { IntegrationsModule } from '../integrations/integrations.module';
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
