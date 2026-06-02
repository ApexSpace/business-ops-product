import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MembershipModule } from '../membership/membership.module';
import { CalendarsController } from './controllers/calendars.controller';
import { CalendarRepository } from './repositories/calendar.repository';
import { CalendarsService } from './services/calendars.service';

@Module({
  imports: [AuditModule, MembershipModule],
  controllers: [CalendarsController],
  providers: [CalendarRepository, CalendarsService],
  exports: [CalendarRepository, CalendarsService],
})
export class CalendarsModule {}
