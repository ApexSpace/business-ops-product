import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { EstimatesModule } from '@app/modules/finance/estimates/estimates.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { WorkItemsModule } from '@app/modules/operations/work-items/work-items.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { EmailModule } from '@app/modules/communications/email/email.module';
import { PaymentsModule } from '@app/modules/finance/payments/payments.module';
import { ProductsModule } from '@app/modules/finance/products/products.module';
import { GiftCardsModule } from '@app/modules/finance/gift-cards/gift-cards.module';
import { PackagesModule } from '@app/modules/finance/packages/packages.module';
import { MembershipsModule } from '@app/modules/finance/memberships/memberships.module';
import { OffersModule } from '@app/modules/finance/offers/offers.module';
import { CheckoutsController } from './controllers/checkouts.controller';
import { InvoicesController } from './controllers/invoices.controller';
import { PublicInvoicesController } from './controllers/public-invoices.controller';
import { CheckoutRepository } from './repositories/checkout.repository';
import { InvoiceRepository } from './repositories/invoice.repository';
import { CheckoutCompletionService } from './services/checkout-completion.service';
import { CheckoutOffersService } from './services/checkout-offers.service';
import { CheckoutsService } from './services/checkouts.service';
import { InvoicePaymentService } from './services/invoice-payment.service';
import { InvoicesService } from './services/invoices.service';
import { StripeInvoicePaymentService } from './services/stripe-invoice-payment.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => ContactsModule),
    forwardRef(() => EstimatesModule),
    ServicesModule,
    forwardRef(() => WorkItemsModule),
    forwardRef(() => IntegrationsModule),
    forwardRef(() => EmailModule),
    forwardRef(() => PaymentsModule),
    ProductsModule,
    forwardRef(() => GiftCardsModule),
    forwardRef(() => PackagesModule),
    forwardRef(() => MembershipsModule),
    forwardRef(() => OffersModule),
  ],
  controllers: [
    InvoicesController,
    PublicInvoicesController,
    CheckoutsController,
  ],
  providers: [
    InvoiceRepository,
    CheckoutRepository,
    InvoicesService,
    CheckoutsService,
    CheckoutOffersService,
    CheckoutCompletionService,
    InvoicePaymentService,
    StripeInvoicePaymentService,
  ],
  exports: [
    InvoiceRepository,
    CheckoutRepository,
    InvoicesService,
    CheckoutsService,
    CheckoutOffersService,
    CheckoutCompletionService,
    InvoicePaymentService,
    StripeInvoicePaymentService,
  ],
})
export class InvoicesModule {}
