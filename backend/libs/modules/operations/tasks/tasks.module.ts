import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { LeadsModule } from '@app/modules/crm/leads/leads.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { TasksController } from './controllers/tasks.controller';
import { TaskRepository } from './repositories/task.repository';
import { TasksService } from './services/tasks.service';

@Module({
  imports: [AuditModule, ContactsModule, LeadsModule, MembershipModule],
  controllers: [TasksController],
  providers: [TaskRepository, TasksService],
  exports: [TaskRepository, TasksService],
})
export class TasksModule {}
