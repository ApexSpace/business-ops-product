import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { FilesModule } from './files/files.module';
import { JobsModule } from './jobs/jobs.module';
import { MembershipModule } from './membership/membership.module';
import { PlatformModule as PlatformSettingsModule } from './platform/platform.module';
import { CapabilitiesModule } from './capabilities/capabilities.module';
import { PlanGroupsModule } from './plan-groups/plan-groups.module';
import { SnapshotsModule } from './snapshots/snapshots.module';

@Module({
  imports: [
    AuthModule,
    BusinessModule,
    MembershipModule,
    PlatformSettingsModule,
    AuditModule,
    JobsModule,
    FilesModule,
    SnapshotsModule,
    CapabilitiesModule,
    PlanGroupsModule,
  ],
  exports: [
    AuthModule,
    BusinessModule,
    AuditModule,
    JobsModule,
    SnapshotsModule,
    CapabilitiesModule,
    PlanGroupsModule,
  ],
})
export class PlatformModule {}
