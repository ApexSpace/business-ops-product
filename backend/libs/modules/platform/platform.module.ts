import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { BusinessModule } from './business/business.module';
import { FilesModule } from './files/files.module';
import { JobsModule } from './jobs/jobs.module';
import { MembershipModule } from './membership/membership.module';
import { PlansModule } from './plans/plans.module';
import { PlatformModule as PlatformSettingsModule } from './platform/platform.module';

@Module({
  imports: [
    AuthModule,
    BusinessModule,
    MembershipModule,
    PlansModule,
    BillingModule,
    PlatformSettingsModule,
    AuditModule,
    JobsModule,
    FilesModule,
  ],
  exports: [AuthModule, BusinessModule, AuditModule, JobsModule],
})
export class PlatformModule {}
