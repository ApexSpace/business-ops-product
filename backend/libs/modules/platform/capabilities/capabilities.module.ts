import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { OperationsModule } from '@app/modules/platform/operations/operations.module';
import { PlatformCapabilitiesController } from './controllers/platform-capabilities.controller';
import { CapabilityRepository } from './repositories/capability.repository';
import { CapabilitiesService } from './services/capabilities.service';
import { CapabilityConfigSchemasService } from './services/capability-config-schemas.service';
import { CapabilityEntitlementImpactService } from './services/capability-entitlement-impact.service';
import { CapabilityFeaturesService } from './services/capability-features.service';
import { CapabilityLimitsService } from './services/capability-limits.service';
import { CapabilityModulesService } from './services/capability-modules.service';
import { CapabilityNavigationService } from './services/capability-navigation.service';
import { CapabilityPermissionsService } from './services/capability-permissions.service';
import { CapabilityRegistrySyncService } from './services/capability-registry-sync.service';
import { CapabilityFeatureKeyMigrationService } from './services/capability-feature-key-migration.service';
import { CapabilityValidationService } from './services/capability-validation.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => OperationsModule),
  ],
  controllers: [PlatformCapabilitiesController],
  providers: [
    CapabilitiesService,
    CapabilityModulesService,
    CapabilityFeaturesService,
    CapabilityPermissionsService,
    CapabilityLimitsService,
    CapabilityNavigationService,
    CapabilityConfigSchemasService,
    CapabilityRegistrySyncService,
    CapabilityFeatureKeyMigrationService,
    CapabilityValidationService,
    CapabilityEntitlementImpactService,
    CapabilityRepository,
  ],
  exports: [
    CapabilitiesService,
    CapabilityRegistrySyncService,
    CapabilityFeatureKeyMigrationService,
    CapabilityRepository,
    CapabilityEntitlementImpactService,
  ],
})
export class CapabilitiesModule {}
