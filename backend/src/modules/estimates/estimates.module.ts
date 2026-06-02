import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BusinessModule } from '../business/business.module';
import { ContactsModule } from '../contacts/contacts.module';
import { ServicesModule } from '../services/services.module';
import { WorkItemsModule } from '../work-items/work-items.module';
import { EstimatesController } from './controllers/estimates.controller';
import { EstimateRepository } from './repositories/estimate.repository';
import { EstimatesService } from './services/estimates.service';

@Module({
  imports: [AuditModule, BusinessModule, ContactsModule, ServicesModule, WorkItemsModule],
  controllers: [EstimatesController],
  providers: [EstimateRepository, EstimatesService],
  exports: [EstimateRepository, EstimatesService],
})
export class EstimatesModule {}
