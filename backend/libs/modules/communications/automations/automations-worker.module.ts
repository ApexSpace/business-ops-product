import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { LeadsModule } from '@app/modules/crm/leads/leads.module';
import { NotesModule } from '@app/modules/crm/notes/notes.module';
import { TasksModule } from '@app/modules/operations/tasks/tasks.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { EmailModule } from '../email/email.module';
import { AutomationStepProcessor } from './workers/processors/automation-step.processor';
import { AutomationActionExecutorService } from './services/automation-action-executor.service';
import { AutomationEngineService } from './services/automation-engine.service';
import { CustomValueResolverService } from './services/custom-value-resolver.service';
import {
  AutomationWorkflowRepository,
  AutomationWorkflowRunRepository,
} from './repositories/automation-workflow.repository';

@Module({
  imports: [
    AuditModule,
    EmailModule,
    ContactsModule,
    forwardRef(() => LeadsModule),
    NotesModule,
    TasksModule,
    MembershipModule,
  ],
  providers: [
    AutomationWorkflowRepository,
    AutomationWorkflowRunRepository,
    CustomValueResolverService,
    AutomationEngineService,
    AutomationActionExecutorService,
    AutomationStepProcessor,
  ],
  exports: [
    AutomationWorkflowRepository,
    AutomationWorkflowRunRepository,
    AutomationEngineService,
    AutomationStepProcessor,
  ],
})
export class AutomationsWorkerModule {}
