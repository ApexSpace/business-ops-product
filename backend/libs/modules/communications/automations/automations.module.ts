import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { AutomationMetadataController } from './controllers/automation-metadata.controller';
import { AutomationWorkflowsController } from './controllers/automation-workflows.controller';
import { PlatformAutomationMetadataController } from './controllers/platform-automation-metadata.controller';
import { PlatformAutomationWorkflowsController } from './controllers/platform-automation-workflows.controller';
import { AutomationAuditListener } from './listeners/automation-audit.listener';
import { AutomationEngineListener } from './listeners/automation-engine.listener';
import { AutomationStopOnResponseListener } from './listeners/automation-stop-on-response.listener';
import { AutomationMetadataService } from './services/automation-metadata.service';
import { AutomationWorkflowsService } from './services/automation-workflows.service';
import { DomainEventBusService } from './services/domain-event-bus.service';
import { OpsAutomationsEmailBootstrapService } from './services/ops-automations-email-bootstrap.service';
import { AutomationsWorkerModule } from './automations-worker.module';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    IntegrationsModule,
    AutomationsWorkerModule,
  ],
  controllers: [
    AutomationMetadataController,
    AutomationWorkflowsController,
    PlatformAutomationMetadataController,
    PlatformAutomationWorkflowsController,
  ],
  providers: [
    AutomationMetadataService,
    DomainEventBusService,
    AutomationAuditListener,
    AutomationEngineListener,
    AutomationStopOnResponseListener,
    AutomationWorkflowsService,
    OpsAutomationsEmailBootstrapService,
  ],
  exports: [
    AutomationMetadataService,
    DomainEventBusService,
    AutomationsWorkerModule,
  ],
})
export class AutomationsModule {}
