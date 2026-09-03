import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { OnlineBookingSettingsController } from './controllers/online-booking-settings.controller';
import { QuickToolsController } from './quick-tools/controllers/quick-tools.controller';
import { OnlineBookingSettingsRepository } from './repositories/online-booking-settings.repository';
import { StaffWorkExceptionRepository } from './staff-work-exceptions/repositories/staff-work-exception.repository';
import { OnlineBookingSettingsService } from './services/online-booking-settings.service';
import { WorkingHoursService } from './services/working-hours.service';
import { QuickToolsService } from './quick-tools/services/quick-tools.service';

@Module({
  imports: [
    AuditModule,
    MembershipModule,
    forwardRef(() => BusinessModule),
  ],
  controllers: [OnlineBookingSettingsController, QuickToolsController],
  providers: [
    OnlineBookingSettingsRepository,
    StaffWorkExceptionRepository,
    OnlineBookingSettingsService,
    WorkingHoursService,
    QuickToolsService,
  ],
  exports: [
    OnlineBookingSettingsRepository,
    StaffWorkExceptionRepository,
    OnlineBookingSettingsService,
    WorkingHoursService,
  ],
})
export class OnlineBookingSettingsModule {}
