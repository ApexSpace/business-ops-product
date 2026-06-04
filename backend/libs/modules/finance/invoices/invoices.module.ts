import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { EstimatesModule } from '@app/modules/finance/estimates/estimates.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { WorkItemsModule } from '@app/modules/operations/work-items/work-items.module';
import { InvoicesController } from './controllers/invoices.controller';
import { InvoiceRepository } from './repositories/invoice.repository';
import { InvoicesService } from './services/invoices.service';

@Module({
  imports: [
    AuditModule,
    BusinessModule,
    ContactsModule,
    EstimatesModule,
    ServicesModule,
    WorkItemsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoiceRepository, InvoicesService],
  exports: [InvoiceRepository, InvoicesService],
})
export class InvoicesModule {}
