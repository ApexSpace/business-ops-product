import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { AutomationMetadataController } from './controllers/automation-metadata.controller';
import { AutomationWorkflowsController } from './controllers/automation-workflows.controller';
import { AutomationAuditListener } from './listeners/automation-audit.listener';
import { AutomationEngineListener } from './listeners/automation-engine.listener';
import { AutomationStopOnResponseListener } from './listeners/automation-stop-on-response.listener';
import { AutomationMetadataService } from './services/automation-metadata.service';
import { AutomationWorkflowsService } from './services/automation-workflows.service';
import { DomainEventBusService } from './services/domain-event-bus.service';
import { AutomationsWorkerModule } from './automations-worker.module';

@Module({
  imports: [AuditModule, BusinessModule, AutomationsWorkerModule],
  controllers: [AutomationMetadataController, AutomationWorkflowsController],
  providers: [
    AutomationMetadataService,
    DomainEventBusService,
    AutomationAuditListener,
    AutomationEngineListener,
    AutomationStopOnResponseListener,
    AutomationWorkflowsService,
  ],
  exports: [
    AutomationMetadataService,
    DomainEventBusService,
    AutomationsWorkerModule,
  ],
})
export class AutomationsModule {}
