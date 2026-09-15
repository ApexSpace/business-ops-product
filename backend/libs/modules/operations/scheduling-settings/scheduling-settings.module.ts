import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { CalendarsModule } from '@app/modules/operations/calendars/calendars.module';
import { OnlineBookingSettingsModule } from '@app/modules/operations/online-booking-settings/online-booking-settings.module';
import { SchedulingSettingsController } from './controllers/scheduling-settings.controller';
import { SchedulingSettingsRepository } from './repositories/scheduling-settings.repository';
import { SchedulingSettingsService } from './services/scheduling-settings.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    OnlineBookingSettingsModule,
    CalendarsModule,
  ],
  controllers: [SchedulingSettingsController],
  providers: [SchedulingSettingsRepository, SchedulingSettingsService],
  exports: [SchedulingSettingsRepository, SchedulingSettingsService],
})
export class SchedulingSettingsModule {}
