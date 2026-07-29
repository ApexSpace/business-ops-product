import { Module, forwardRef } from '@nestjs/common';
import { EstimatesModule } from './estimates/estimates.module';
import { GiftCardsModule } from './gift-cards/gift-cards.module';
import { PackagesModule } from './packages/packages.module';
import { MembershipsModule } from './memberships/memberships.module';
import { OffersModule } from './offers/offers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    forwardRef(() => InvoicesModule),
    forwardRef(() => PaymentsModule),
    EstimatesModule,
    ProductsModule,
    GiftCardsModule,
    PackagesModule,
    MembershipsModule,
    OffersModule,
  ],
  exports: [
    ProductsModule,
    GiftCardsModule,
    PackagesModule,
    MembershipsModule,
    OffersModule,
  ],
})
export class FinanceModule {}
