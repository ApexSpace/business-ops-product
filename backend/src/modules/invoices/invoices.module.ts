import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BusinessModule } from '../business/business.module';
import { ContactsModule } from '../contacts/contacts.module';
import { EstimatesModule } from '../estimates/estimates.module';
import { ServicesModule } from '../services/services.module';
import { WorkItemsModule } from '../work-items/work-items.module';
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
