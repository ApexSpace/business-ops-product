import { Module } from '@nestjs/common';
import { EstimatesModule } from './estimates/estimates.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [InvoicesModule, PaymentsModule, EstimatesModule],
})
export class FinanceModule {}
