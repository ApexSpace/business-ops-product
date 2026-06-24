import { Module } from '@nestjs/common';
import { FinanceModule } from './finance.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [FinanceModule, ProductsModule],
})
export class FinanceApiModule {}
