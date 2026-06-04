import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { BusinessModule } from './business/business.module';
import { MembershipModule } from './membership/membership.module';
import { PlansModule } from './plans/plans.module';
import { PlatformModule } from './platform/platform.module';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    BusinessModule,
    MembershipModule,
    PlansModule,
    BillingModule,
    PlatformModule,
  ],
  exports: [
    AuditModule,
    AuthModule,
    BusinessModule,
    MembershipModule,
    PlansModule,
    BillingModule,
    PlatformModule,
  ],
})
export class PlatformCategoryModule {}
