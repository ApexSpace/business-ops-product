import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { CalendarsModule } from '@app/modules/operations/calendars/calendars.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { WorkItemsModule } from '@app/modules/operations/work-items/work-items.module';
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
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentRepository, AppointmentsService],
  exports: [AppointmentRepository, AppointmentsService],
})
export class AppointmentsModule {}
