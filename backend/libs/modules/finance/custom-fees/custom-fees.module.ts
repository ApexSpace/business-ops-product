import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { CustomFeesController } from './controllers/custom-fees.controller';
import { CustomFeeRepository } from './repositories/custom-fee.repository';
import { CustomFeeEvaluationService } from './services/custom-fee-evaluation.service';
import { CustomFeesService } from './services/custom-fees.service';

@Module({
  imports: [AuditModule],
  controllers: [CustomFeesController],
  providers: [CustomFeeRepository, CustomFeesService, CustomFeeEvaluationService],
  exports: [CustomFeeRepository, CustomFeesService, CustomFeeEvaluationService],
})
export class CustomFeesModule {}
