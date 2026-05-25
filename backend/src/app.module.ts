import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './core/database/prisma.module';
import { HealthModule } from './core/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessModule } from './modules/business/business.module';
import { MembershipModule } from './modules/membership/membership.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ServicesModule } from './modules/services/services.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { PlatformModule } from './modules/platform/platform.module';
import { IndustriesModule } from './modules/industries/industries.module';
import { PlansModule } from './modules/plans/plans.module';
import { BillingModule } from './modules/billing/billing.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    AuditModule,
    AuthModule,
    BusinessModule,
    MembershipModule,
    ContactsModule,
    PipelinesModule,
    LeadsModule,
    ServicesModule,
    PlatformModule,
    PlansModule,
    IndustriesModule,
    BillingModule,
  ],
  providers: [
    TransformInterceptor,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
