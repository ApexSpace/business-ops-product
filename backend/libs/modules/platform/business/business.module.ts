import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { IndustriesModule } from '@app/modules/crm/industries/industries.module';
import { SnapshotsModule } from '@app/modules/platform/snapshots/snapshots.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { PlanGroupsModule } from '@app/modules/platform/plan-groups/plan-groups.module';
import { BusinessController } from './controllers/business.controller';
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
import { FinancialSettingsService } from './services/financial-settings.service';
import { PlatformBusinessUtilizationService } from './services/platform-business-utilization.service';
import { BusinessSubscriptionActionAvailabilityService } from './services/business-subscription-action-availability.service';
import { BusinessSubscriptionActionService } from './services/business-subscription-action.service';
import { BusinessSubscriptionEventService } from './services/business-subscription-event.service';
import { BusinessSubscriptionPaymentService } from './services/business-subscription-payment.service';
import { BusinessBillingService } from './services/business-billing.service';

@Module({
  imports: [
    AuditModule,
    IndustriesModule,
    SnapshotsModule,
    PlanGroupsModule,
    forwardRef(() => MembershipModule),
  ],
  controllers: [
    PlatformBusinessController,
    PlatformBusinessAccessController,
    BusinessController,
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
    FinancialSettingsService,
    PlatformBusinessUtilizationService,
    BusinessSubscriptionEventService,
    BusinessSubscriptionPaymentService,
    BusinessSubscriptionActionAvailabilityService,
    BusinessSubscriptionActionService,
    BusinessBillingService,
  ],
  exports: [
    BusinessRepository,
    BusinessService,
    BusinessAccessService,
    BusinessAccessResolverService,
    BusinessCapabilityCheckService,
    BusinessCapabilityGuard,
    BusinessEffectiveCapabilitiesService,
    BusinessSubscriptionActionService,
    BusinessSubscriptionEventService,
    BusinessSubscriptionPaymentService,
    FinancialSettingsService,
  ],
})
export class BusinessModule {}
