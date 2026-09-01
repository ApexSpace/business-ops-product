import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { CalendarsController } from './controllers/calendars.controller';
import { CalendarDisplaySettingsController } from './display-settings/controllers/calendar-display-settings.controller';
import { CalendarDisplaySettingsRepository } from './display-settings/repositories/calendar-display-settings.repository';
import { CalendarDisplaySettingsService } from './display-settings/services/calendar-display-settings.service';
import { CalendarRepository } from './repositories/calendar.repository';
import { CalendarsService } from './services/calendars.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => MembershipModule),
  ],
  controllers: [CalendarsController, CalendarDisplaySettingsController],
  providers: [
    CalendarRepository,
    CalendarsService,
    CalendarDisplaySettingsRepository,
    CalendarDisplaySettingsService,
  ],
  exports: [
    CalendarRepository,
    CalendarsService,
    CalendarDisplaySettingsRepository,
    CalendarDisplaySettingsService,
  ],
})
export class CalendarsModule {}
