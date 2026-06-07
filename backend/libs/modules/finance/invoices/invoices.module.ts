import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { EstimatesModule } from '@app/modules/finance/estimates/estimates.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { WorkItemsModule } from '@app/modules/operations/work-items/work-items.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { EmailModule } from '@app/modules/communications/email/email.module';
import { InvoicesController } from './controllers/invoices.controller';
import { PublicInvoicesController } from './controllers/public-invoices.controller';
import { InvoiceRepository } from './repositories/invoice.repository';
import { InvoicePaymentService } from './services/invoice-payment.service';
import { InvoicesService } from './services/invoices.service';
import { StripeInvoicePaymentService } from './services/stripe-invoice-payment.service';

@Module({
  imports: [
    AuditModule,
    BusinessModule,
    ContactsModule,
    EstimatesModule,
    ServicesModule,
    WorkItemsModule,
    forwardRef(() => IntegrationsModule),
    EmailModule,
  ],
  controllers: [InvoicesController, PublicInvoicesController],
  providers: [
    InvoiceRepository,
    InvoicesService,
    InvoicePaymentService,
    StripeInvoicePaymentService,
  ],
  exports: [
    InvoiceRepository,
    InvoicesService,
    InvoicePaymentService,
    StripeInvoicePaymentService,
  ],
})
export class InvoicesModule {}
