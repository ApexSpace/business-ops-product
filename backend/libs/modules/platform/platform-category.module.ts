import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { MembershipModule } from './membership/membership.module';
import { CapabilitiesModule } from './capabilities/capabilities.module';
import { PlanGroupsModule } from './plan-groups/plan-groups.module';
import { PlatformModule } from './platform/platform.module';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    BusinessModule,
    MembershipModule,
    PlatformModule,
    CapabilitiesModule,
    PlanGroupsModule,
  ],
  exports: [
    AuditModule,
    AuthModule,
    BusinessModule,
    MembershipModule,
    PlatformModule,
    CapabilitiesModule,
    PlanGroupsModule,
  ],
})
export class PlatformCategoryModule {}
