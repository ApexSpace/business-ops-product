import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { RealtimeModule } from '@app/core/realtime/realtime.module';
import { InvoicesModule } from '@app/modules/finance/invoices/invoices.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { EmailModule } from '@app/modules/communications/email/email.module';
import { PaymentsController } from './controllers/payments.controller';
import { InvoicePayableHandler } from './handlers/invoice-payable.handler';
import { PaymentOrchestratorService } from './orchestration/payment-orchestrator.service';
import { PayableHandlerRegistry } from './registry/payable-handler.registry';
import { ContactPaymentMethodRepository } from './repositories/contact-payment-method.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { ContactPaymentMethodsService } from './services/contact-payment-methods.service';
import { PaymentRealtimeService } from './services/payment-realtime.service';
import { PaymentsOverviewService } from './services/payments-overview.service';
import { PaymentsService } from './services/payments.service';
import { StripeContactPaymentMethodService } from './services/stripe-contact-payment-method.service';
import { WalletLedgerService } from './services/wallet-ledger.service';
import { GiftCardsModule } from '@app/modules/finance/gift-cards/gift-cards.module';

@Module({
  imports: [
    AuditModule,
    RealtimeModule,
    ContactsModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => InvoicesModule),
    forwardRef(() => IntegrationsModule),
    forwardRef(() => EmailModule),
    forwardRef(() => GiftCardsModule),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentRepository,
    ContactPaymentMethodRepository,
    PaymentsService,
    PaymentsOverviewService,
    PayableHandlerRegistry,
    InvoicePayableHandler,
    WalletLedgerService,
    StripeContactPaymentMethodService,
    ContactPaymentMethodsService,
    PaymentRealtimeService,
    PaymentOrchestratorService,
  ],
  exports: [
    PaymentRepository,
    PaymentsService,
    PaymentsOverviewService,
    PaymentOrchestratorService,
    WalletLedgerService,
    PayableHandlerRegistry,
    PaymentRealtimeService,
    ContactPaymentMethodsService,
    StripeContactPaymentMethodService,
  ],
})
export class PaymentsModule {}
