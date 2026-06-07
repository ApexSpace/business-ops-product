import { Module } from '@nestjs/common';
import { FinancialDueStatusService } from './services/financial-due-status.service';

@Module({
  providers: [FinancialDueStatusService],
  exports: [FinancialDueStatusService],
})
export class FinancialDueStatusModule {}
