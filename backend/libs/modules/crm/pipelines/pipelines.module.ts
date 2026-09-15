import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { PipelineStagesController } from './controllers/pipeline-stages.controller';
import { PipelinesController } from './controllers/pipelines.controller';
import { PlatformPipelineStagesController } from './controllers/platform-pipeline-stages.controller';
import { PlatformPipelinesController } from './controllers/platform-pipelines.controller';
import { PipelineRepository } from './repositories/pipeline.repository';
import { PipelineStageRepository } from './repositories/pipeline-stage.repository';
import { PipelineProvisioningService } from './services/pipeline-provisioning.service';
import { PipelineStagesService } from './services/pipeline-stages.service';
import { PipelinesService } from './services/pipelines.service';

@Module({
  imports: [AuditModule, forwardRef(() => BusinessModule)],
  controllers: [
    PipelinesController,
    PipelineStagesController,
    PlatformPipelinesController,
    PlatformPipelineStagesController,
  ],
  providers: [
    PipelineRepository,
    PipelineStageRepository,
    PipelineProvisioningService,
    PipelinesService,
    PipelineStagesService,
  ],
  exports: [
    PipelineRepository,
    PipelineStageRepository,
    PipelineProvisioningService,
    PipelinesService,
    PipelineStagesService,
  ],
})
export class PipelinesModule {}
