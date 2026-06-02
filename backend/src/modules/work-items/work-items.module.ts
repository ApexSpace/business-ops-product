import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { MembershipModule } from '../membership/membership.module';
import { ServicesModule } from '../services/services.module';
import { WorkItemsController } from './controllers/work-items.controller';
import { WorkItemRepository } from './repositories/work-item.repository';
import { WorkItemsService } from './services/work-items.service';

@Module({
  imports: [AuditModule, ContactsModule, ServicesModule, LeadsModule, MembershipModule],
  controllers: [WorkItemsController],
  providers: [WorkItemRepository, WorkItemsService],
  exports: [WorkItemRepository, WorkItemsService],
})
export class WorkItemsModule {}
