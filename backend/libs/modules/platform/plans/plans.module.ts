import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { PlatformPlansController } from './controllers/platform-plans.controller';
import { PlanRepository } from './repositories/plan.repository';
import { PlansService } from './services/plans.service';

@Module({
  imports: [AuditModule],
  controllers: [PlatformPlansController],
  providers: [PlansService, PlanRepository],
  exports: [PlansService, PlanRepository],
})
export class PlansModule {}
