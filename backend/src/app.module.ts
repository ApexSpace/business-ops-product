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
import { WorkItemsModule } from './modules/work-items/work-items.module';
import { NotesModule } from './modules/notes/notes.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { EstimatesModule } from './modules/estimates/estimates.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { PlatformModule } from './modules/platform/platform.module';
import { IndustriesModule } from './modules/industries/industries.module';
import { PlansModule } from './modules/plans/plans.module';
import { BillingModule } from './modules/billing/billing.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { CalendarsModule } from './modules/calendars/calendars.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { GoogleCalendarSyncModule } from './modules/google-calendar-sync/google-calendar-sync.module';

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
    WorkItemsModule,
    NotesModule,
    TasksModule,
    EstimatesModule,
    InvoicesModule,
    PaymentsModule,
    PlatformModule,
    PlansModule,
    IndustriesModule,
    BillingModule,
    IntegrationsModule,
    CalendarsModule,
    AppointmentsModule,
    GoogleCalendarSyncModule,
  ],
  providers: [
    TransformInterceptor,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
