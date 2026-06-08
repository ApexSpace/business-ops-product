import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { IndustriesModule } from '@app/modules/crm/industries/industries.module';
import { SnapshotsModule } from '@app/modules/platform/snapshots/snapshots.module';
import { BusinessController } from './controllers/business.controller';
import { PlatformBusinessController } from './controllers/platform-business.controller';
import { BusinessRepository } from './repositories/business.repository';
import { BusinessService } from './services/business.service';
import { DashboardStatsService } from './services/dashboard-stats.service';
import { FinancialSettingsService } from './services/financial-settings.service';
import { PlatformBusinessUtilizationService } from './services/platform-business-utilization.service';

@Module({
  imports: [AuditModule, IndustriesModule, SnapshotsModule],
  controllers: [PlatformBusinessController, BusinessController],
  providers: [
    BusinessRepository,
    BusinessService,
    DashboardStatsService,
    FinancialSettingsService,
    PlatformBusinessUtilizationService,
  ],
  exports: [BusinessRepository, BusinessService, FinancialSettingsService],
})
export class BusinessModule {}
