import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { LeadsModule } from '@app/modules/crm/leads/leads.module';
import { NotesModule } from '@app/modules/crm/notes/notes.module';
import { TasksModule } from '@app/modules/operations/tasks/tasks.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { AutomationStepProcessor } from './workers/processors/automation-step.processor';
import { AutomationActionExecutorService } from './services/automation-action-executor.service';
import { AutomationEngineService } from './services/automation-engine.service';
import { AutomationAppointmentTriggerService } from './services/automation-appointment-trigger.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { EnrollmentFilterService } from './services/enrollment-filter.service';
import { CustomValueResolverService } from './services/custom-value-resolver.service';
import {
  AutomationWorkflowRepository,
  AutomationWorkflowRunRepository,
} from './repositories/automation-workflow.repository';

@Module({
  imports: [
    AuditModule,
    EmailModule,
    SmsModule,
    ContactsModule,
    forwardRef(() => LeadsModule),
    NotesModule,
    TasksModule,
    MembershipModule,
    forwardRef(() => BusinessModule),
  ],
  providers: [
    AutomationWorkflowRepository,
    AutomationWorkflowRunRepository,
    CustomValueResolverService,
    ConditionEvaluatorService,
    EnrollmentFilterService,
    AutomationEngineService,
    AutomationActionExecutorService,
    AutomationAppointmentTriggerService,
    AutomationStepProcessor,
  ],
  exports: [
    AutomationWorkflowRepository,
    AutomationWorkflowRunRepository,
    AutomationEngineService,
    AutomationAppointmentTriggerService,
    AutomationStepProcessor,
  ],
})
export class AutomationsWorkerModule {}
