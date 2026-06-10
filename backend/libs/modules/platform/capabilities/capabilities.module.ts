import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { PlatformCapabilitiesController } from './controllers/platform-capabilities.controller';
import { CapabilityRepository } from './repositories/capability.repository';
import { CapabilitiesService } from './services/capabilities.service';
import { CapabilityConfigSchemasService } from './services/capability-config-schemas.service';
import { CapabilityFeaturesService } from './services/capability-features.service';
import { CapabilityLimitsService } from './services/capability-limits.service';
import { CapabilityModulesService } from './services/capability-modules.service';
import { CapabilityNavigationService } from './services/capability-navigation.service';
import { CapabilityPermissionsService } from './services/capability-permissions.service';
import { CapabilityRegistrySyncService } from './services/capability-registry-sync.service';
import { CapabilityValidationService } from './services/capability-validation.service';

@Module({
  imports: [AuditModule],
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
    CapabilityValidationService,
    CapabilityRepository,
  ],
  exports: [
    CapabilitiesService,
    CapabilityRegistrySyncService,
    CapabilityRepository,
  ],
})
export class CapabilitiesModule {}
