import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { WorkItemsModule } from '@app/modules/operations/work-items/work-items.module';
import { EstimatesController } from './controllers/estimates.controller';
import { EstimateRepository } from './repositories/estimate.repository';
import { EstimatesService } from './services/estimates.service';

@Module({
  imports: [
    AuditModule,
    BusinessModule,
    ContactsModule,
    ServicesModule,
    WorkItemsModule,
  ],
  controllers: [EstimatesController],
  providers: [EstimateRepository, EstimatesService],
  exports: [EstimateRepository, EstimatesService],
})
export class EstimatesModule {}
