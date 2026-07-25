import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { ResourcesModule } from '@app/modules/operations/resources/resources.module';
import { ServiceCategoriesController } from './controllers/service-categories.controller';
import { ServiceWorkspaceController } from './controllers/service-workspace.controller';
import { ServicesController } from './controllers/services.controller';
import { ServiceCategoryRepository } from './repositories/service-category.repository';
import { ServiceRepository } from './repositories/service.repository';
import { ServiceWorkspaceRepository } from './repositories/service-workspace.repository';
import { ServiceCategoriesService } from './services/service-categories.service';
import { ServiceBookingTimingService } from './services/service-booking-timing.service';
import { ServiceWorkspaceService } from './services/service-workspace.service';
import { ServicesService } from './services/services.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => MembershipModule),
    ResourcesModule,
  ],
  controllers: [
    ServiceCategoriesController,
    ServiceWorkspaceController,
    ServicesController,
  ],
  providers: [
    ServiceRepository,
    ServiceCategoryRepository,
    ServiceWorkspaceRepository,
    ServicesService,
    ServiceCategoriesService,
    ServiceWorkspaceService,
    ServiceBookingTimingService,
  ],
  exports: [
    ServiceRepository,
    ServiceWorkspaceRepository,
    ServicesService,
    ServiceWorkspaceService,
    ServiceBookingTimingService,
  ],
})
export class ServicesModule {}
