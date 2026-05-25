import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { IndustriesModule } from '../industries/industries.module';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { BusinessController } from './controllers/business.controller';
import { PlatformBusinessController } from './controllers/platform-business.controller';
import { BusinessRepository } from './repositories/business.repository';
import { BusinessService } from './services/business.service';
import { DashboardStatsService } from './services/dashboard-stats.service';

@Module({
  imports: [AuditModule, PipelinesModule, IndustriesModule],
  controllers: [PlatformBusinessController, BusinessController],
  providers: [BusinessRepository, BusinessService, DashboardStatsService],
  exports: [BusinessRepository, BusinessService],
})
export class BusinessModule {}
