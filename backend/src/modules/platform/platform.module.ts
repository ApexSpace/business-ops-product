import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PlatformDashboardController } from './controllers/platform-dashboard.controller';
import { PlatformSettingsController } from './controllers/platform-settings.controller';
import { PlatformSettingRepository } from './repositories/platform-setting.repository';
import { PlatformDashboardService } from './services/platform-dashboard.service';
import { PlatformSettingsService } from './services/platform-settings.service';

@Module({
  imports: [AuditModule],
  controllers: [PlatformDashboardController, PlatformSettingsController],
  providers: [
    PlatformDashboardService,
    PlatformSettingsService,
    PlatformSettingRepository,
  ],
})
export class PlatformModule {}
