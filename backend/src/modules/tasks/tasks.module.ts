import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { MembershipModule } from '../membership/membership.module';
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
