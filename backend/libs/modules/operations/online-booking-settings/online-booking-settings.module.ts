import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { OnlineBookingSettingsController } from './controllers/online-booking-settings.controller';
import { OnlineBookingSettingsRepository } from './repositories/online-booking-settings.repository';
import { OnlineBookingSettingsService } from './services/online-booking-settings.service';
import { WorkingHoursService } from './services/working-hours.service';

@Module({
  imports: [AuditModule],
  controllers: [OnlineBookingSettingsController],
  providers: [
    OnlineBookingSettingsRepository,
    OnlineBookingSettingsService,
    WorkingHoursService,
  ],
  exports: [
    OnlineBookingSettingsRepository,
    OnlineBookingSettingsService,
    WorkingHoursService,
  ],
})
export class OnlineBookingSettingsModule {}
