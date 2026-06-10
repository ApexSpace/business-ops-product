import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { CapabilitiesModule } from '@app/modules/platform/capabilities/capabilities.module';
import { SnapshotsModule } from '@app/modules/platform/snapshots/snapshots.module';
import { PlatformPlanGroupsController } from './controllers/platform-plan-groups.controller';
import { PublicPricingController } from './controllers/public-pricing.controller';
import { PlanGroupsRepository } from './repositories/plan-groups.repository';
import { PlanEmbedService } from './services/plan-embed.service';
import { PlanFeatureRowsService } from './services/plan-feature-rows.service';
import { PlanGroupsService } from './services/plan-groups.service';
import { PlanTierDefaultsService } from './services/plan-tier-defaults.service';
import { PlanTiersService } from './services/plan-tiers.service';
import { PlanValidationService } from './services/plan-validation.service';

@Module({
  imports: [AuditModule, CapabilitiesModule, SnapshotsModule],
  controllers: [PlatformPlanGroupsController, PublicPricingController],
  providers: [
    PlanGroupsService,
    PlanTiersService,
    PlanTierDefaultsService,
    PlanFeatureRowsService,
    PlanEmbedService,
    PlanValidationService,
    PlanGroupsRepository,
  ],
  exports: [PlanGroupsService, PlanGroupsRepository, PlanTierDefaultsService],
})
export class PlanGroupsModule {}
