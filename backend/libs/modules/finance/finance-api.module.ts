import { Module } from '@nestjs/common';
import { FinanceModule } from './finance.module';
import { GiftCardsModule } from './gift-cards/gift-cards.module';
import { PackagesModule } from './packages/packages.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [FinanceModule, ProductsModule, GiftCardsModule, PackagesModule],
})
export class FinanceApiModule {}
