import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { IndustriesModule } from '@app/modules/crm/industries/industries.module';
import { SnapshotsModule } from '@app/modules/platform/snapshots/snapshots.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { PlanGroupsModule } from '@app/modules/platform/plan-groups/plan-groups.module';
import { TiersModule } from '@app/modules/platform/tiers/tiers.module';
import { AddonsModule } from '@app/modules/platform/addons/addons.module';
import { StripePlatformBillingModule } from '@app/modules/platform/billing/stripe/stripe-platform-billing.module';
import { TwilioModule } from '@app/modules/integrations/twilio/twilio.module';
import { RedisModule } from '@app/core/redis/redis.module';
import { BusinessController } from './controllers/business.controller';
import { BusinessSearchController } from './controllers/business-search.controller';
import { PlatformBusinessAccessController } from './controllers/platform-business-access.controller';
import { PlatformBusinessController } from './controllers/platform-business.controller';
import { BusinessCapabilityRepository } from './repositories/business-capability.repository';
import { BusinessRepository } from './repositories/business.repository';
import { BusinessSubscriptionEventRepository } from './repositories/business-subscription-event.repository';
import { BusinessSubscriptionPaymentRepository } from './repositories/business-subscription-payment.repository';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessAccessResolverService } from './services/business-access-resolver.service';
import { BusinessAccessService } from './services/business-access.service';
import { BusinessCapabilityCheckService } from './services/business-capability-check.service';
import { BusinessCapabilitySyncService } from './services/business-capability-sync.service';
import { BusinessEffectiveCapabilitiesService } from './services/business-effective-capabilities.service';
import { BusinessService } from './services/business.service';
import { DashboardStatsService } from './services/dashboard-stats.service';
import { DashboardFeedService } from './services/dashboard-feed.service';
import { BusinessGlobalSearchService } from './services/business-global-search.service';
import { FinancialSettingsService } from './services/financial-settings.service';
import { PlatformBusinessUtilizationService } from './services/platform-business-utilization.service';
import { BusinessSubscriptionActionAvailabilityService } from './services/business-subscription-action-availability.service';
import { BusinessSubscriptionActionService } from './services/business-subscription-action.service';
import { BusinessSubscriptionEventService } from './services/business-subscription-event.service';
import { BusinessSubscriptionPaymentService } from './services/business-subscription-payment.service';
import { BusinessBillingService } from './services/business-billing.service';
import { EntitlementService } from './services/entitlement.service';
import { BusinessAddonSyncService } from './services/business-addon-sync.service';
import { BusinessStatusService } from './services/business-status.service';
import { MedSpaBootstrapService } from './services/medspa-bootstrap.service';
import { BusinessProvisioningService } from './services/business-provisioning.service';

import { BusinessLocationService } from './services/business-location.service';
import { InternalBusinessService } from './services/internal-business.service';
import { BusinessLifecycleService } from './services/business-lifecycle.service';

@Module({
  imports: [
    AuditModule,
    IndustriesModule,
    SnapshotsModule,
    PlanGroupsModule,
    forwardRef(() => TiersModule),
    forwardRef(() => AddonsModule),
    RedisModule,
    TwilioModule,
    forwardRef(() => MembershipModule),
    forwardRef(() => StripePlatformBillingModule),
  ],
  controllers: [
    PlatformBusinessController,
    PlatformBusinessAccessController,
    BusinessController,
    BusinessSearchController,
  ],
  providers: [
    BusinessRepository,
    BusinessCapabilityRepository,
    BusinessSubscriptionEventRepository,
    BusinessSubscriptionPaymentRepository,
    BusinessService,
    BusinessAccessResolverService,
    BusinessAccessService,
    BusinessCapabilityCheckService,
    BusinessCapabilityGuard,
    BusinessCapabilitySyncService,
    BusinessEffectiveCapabilitiesService,
    DashboardStatsService,
    DashboardFeedService,
    BusinessGlobalSearchService,
    FinancialSettingsService,
    PlatformBusinessUtilizationService,
    BusinessSubscriptionEventService,
    BusinessSubscriptionPaymentService,
    BusinessSubscriptionActionAvailabilityService,
    BusinessSubscriptionActionService,
    BusinessBillingService,
    EntitlementService,
    BusinessAddonSyncService,
    BusinessStatusService,
    MedSpaBootstrapService,
    BusinessProvisioningService,
    BusinessLocationService,
    InternalBusinessService,
    BusinessLifecycleService,
  ],
  exports: [
    BusinessRepository,
    BusinessService,
    BusinessAccessService,
    BusinessAccessResolverService,
    BusinessCapabilityCheckService,
    BusinessCapabilityGuard,
    BusinessCapabilitySyncService,
    InternalBusinessService,
    BusinessEffectiveCapabilitiesService,
    BusinessSubscriptionActionService,
    BusinessSubscriptionEventService,
    BusinessSubscriptionPaymentService,
    BusinessSubscriptionPaymentRepository,
    FinancialSettingsService,
    EntitlementService,
    BusinessAddonSyncService,
    BusinessStatusService,
    MedSpaBootstrapService,
    BusinessProvisioningService,
    BusinessLocationService,
    BusinessLifecycleService,
  ],
})
export class BusinessModule {}
