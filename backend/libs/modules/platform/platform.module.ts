import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { JobsModule } from './jobs/jobs.module';
import { MembershipModule } from './membership/membership.module';
import { PlatformModule as PlatformSettingsModule } from './platform/platform.module';
import { CapabilitiesModule } from './capabilities/capabilities.module';
import { PlanGroupsModule } from './plan-groups/plan-groups.module';
import { TiersModule } from './tiers/tiers.module';
import { AddonsModule } from './addons/addons.module';
import { OperationsModule } from './operations/operations.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { StorageModule } from '@app/modules/storage/storage.module';
import { StripePlatformBillingModule } from './billing/stripe/stripe-platform-billing.module';
import { TrialSignupModule } from './trial-signup/trial-signup.module';
import { DataIoModule } from './data-io/data-io.module';

@Module({
  imports: [
    AuthModule,
    BusinessModule,
    MembershipModule,
    PlatformSettingsModule,
    AuditModule,
    JobsModule,
    StorageModule,
    SnapshotsModule,
    CapabilitiesModule,
    PlanGroupsModule,
    TiersModule,
    AddonsModule,
    OperationsModule,
    StripePlatformBillingModule,
    TrialSignupModule,
    DataIoModule,
  ],
  exports: [
    AuthModule,
    BusinessModule,
    MembershipModule,
    AuditModule,
    JobsModule,
    SnapshotsModule,
    CapabilitiesModule,
    PlanGroupsModule,
    TiersModule,
    AddonsModule,
    OperationsModule,
    StripePlatformBillingModule,
    TrialSignupModule,
    DataIoModule,
  ],
})
export class PlatformModule {}
