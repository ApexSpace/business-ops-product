import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { CalendarsController } from './controllers/calendars.controller';
import { CalendarRepository } from './repositories/calendar.repository';
import { CalendarsService } from './services/calendars.service';

@Module({
  imports: [AuditModule, BusinessModule, MembershipModule],
  controllers: [CalendarsController],
  providers: [CalendarRepository, CalendarsService],
  exports: [CalendarRepository, CalendarsService],
})
export class CalendarsModule {}
