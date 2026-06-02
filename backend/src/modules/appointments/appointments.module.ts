import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CalendarsModule } from '../calendars/calendars.module';
import { ContactsModule } from '../contacts/contacts.module';
import { MembershipModule } from '../membership/membership.module';
import { ServicesModule } from '../services/services.module';
import { WorkItemsModule } from '../work-items/work-items.module';
import { GoogleCalendarSyncModule } from '../google-calendar-sync/google-calendar-sync.module';
import { AppointmentsController } from './controllers/appointments.controller';
import { AppointmentRepository } from './repositories/appointment.repository';
import { AppointmentsService } from './services/appointments.service';

@Module({
  imports: [
    AuditModule,
    CalendarsModule,
    ContactsModule,
    ServicesModule,
    WorkItemsModule,
    MembershipModule,
    forwardRef(() => GoogleCalendarSyncModule),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentRepository, AppointmentsService],
  exports: [AppointmentRepository, AppointmentsService],
})
export class AppointmentsModule {}
