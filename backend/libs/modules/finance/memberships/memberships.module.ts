import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { DomainEventBusService } from '@app/modules/communications/automations/services/domain-event-bus.service';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { PaymentsModule } from '@app/modules/finance/payments/payments.module';
import { ClientMembershipsController } from './controllers/client-memberships.controller';
import { MembershipPlansController } from './controllers/membership-plans.controller';
import { MembershipSettingsController } from './controllers/membership-settings.controller';
import { MembershipsPublicController } from './controllers/memberships-public.controller';
import { ClientMembershipRepository } from './repositories/client-membership.repository';
import { MembershipPlanRepository } from './repositories/membership-plan.repository';
import { MembershipSettingsRepository } from './repositories/membership-settings.repository';
import { ClientMembershipsService } from './services/client-memberships.service';
import { MembershipOnlineCheckoutService } from './services/membership-online-checkout.service';
import { MembershipPlansService } from './services/membership-plans.service';
import { MembershipSettingsService } from './services/membership-settings.service';
import { MembershipStripeService } from './services/membership-stripe.service';
import { MembershipWebhookService } from './services/membership-webhook.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => ContactsModule),
    forwardRef(() => IntegrationsModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [
    MembershipPlansController,
    ClientMembershipsController,
    MembershipSettingsController,
    MembershipsPublicController,
  ],
  providers: [
    DomainEventBusService,
    MembershipPlanRepository,
    ClientMembershipRepository,
    MembershipSettingsRepository,
    MembershipPlansService,
    ClientMembershipsService,
    MembershipSettingsService,
    MembershipStripeService,
    MembershipOnlineCheckoutService,
    MembershipWebhookService,
  ],
  exports: [
    ClientMembershipsService,
    MembershipPlansService,
    MembershipSettingsService,
    MembershipOnlineCheckoutService,
    MembershipWebhookService,
  ],
})
export class MembershipsModule {}
