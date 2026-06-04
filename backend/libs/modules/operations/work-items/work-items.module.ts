import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { LeadsModule } from '@app/modules/crm/leads/leads.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
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
