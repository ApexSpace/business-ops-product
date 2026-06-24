import { Module, forwardRef } from '@nestjs/common';
import { EstimatesModule } from './estimates/estimates.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    forwardRef(() => InvoicesModule),
    forwardRef(() => PaymentsModule),
    EstimatesModule,
    ProductsModule,
  ],
  exports: [ProductsModule],
})
export class FinanceModule {}
