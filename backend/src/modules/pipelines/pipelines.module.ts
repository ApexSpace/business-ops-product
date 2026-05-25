import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PipelineStagesController } from './controllers/pipeline-stages.controller';
import { PipelinesController } from './controllers/pipelines.controller';
import { PipelineRepository } from './repositories/pipeline.repository';
import { PipelineStageRepository } from './repositories/pipeline-stage.repository';
import { PipelineProvisioningService } from './services/pipeline-provisioning.service';
import { PipelineStagesService } from './services/pipeline-stages.service';
import { PipelinesService } from './services/pipelines.service';

@Module({
  imports: [AuditModule],
  controllers: [PipelinesController, PipelineStagesController],
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
  ],
})
export class PipelinesModule {}
