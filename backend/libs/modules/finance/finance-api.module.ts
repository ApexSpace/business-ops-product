import { Module } from '@nestjs/common';
import { FinanceModule } from './finance.module';

@Module({
  imports: [FinanceModule],
})
export class FinanceApiModule {}
