import { Module } from '@nestjs/common';
import { FinanceModule } from './finance.module';
import { GiftCardsModule } from './gift-cards/gift-cards.module';
import { PackagesModule } from './packages/packages.module';
import { MembershipsModule } from './memberships/memberships.module';
import { OffersModule } from './offers/offers.module';
import { CustomFeesModule } from './custom-fees/custom-fees.module';
import { CheckoutAdvancedSettingsModule } from './checkout-advanced-settings/checkout-advanced-settings.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    FinanceModule,
    ProductsModule,
    GiftCardsModule,
    PackagesModule,
    MembershipsModule,
    OffersModule,
    CustomFeesModule,
    CheckoutAdvancedSettingsModule,
  ],
})
export class FinanceApiModule {}
