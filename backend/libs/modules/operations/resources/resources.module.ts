import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ResourceGroupsController } from './controllers/resource-groups.controller';
import { ResourcesController } from './controllers/resources.controller';
import { ResourceGroupRepository } from './repositories/resource-group.repository';
import { ResourceRepository } from './repositories/resource.repository';
import { ResourceGroupsService } from './services/resource-groups.service';
import { ResourcesService } from './services/resources.service';

@Module({
  imports: [AuditModule, forwardRef(() => BusinessModule)],
  controllers: [ResourceGroupsController, ResourcesController],
  providers: [
    ResourceGroupRepository,
    ResourceRepository,
    ResourceGroupsService,
    ResourcesService,
  ],
  exports: [ResourceRepository, ResourcesService],
})
export class ResourcesModule {}
