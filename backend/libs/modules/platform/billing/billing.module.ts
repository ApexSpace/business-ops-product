import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { PlansModule } from '@app/modules/platform/plans/plans.module';
import { PlatformBillingController } from './controllers/platform-billing.controller';
import { BusinessSubscriptionRepository } from './repositories/business-subscription.repository';
import { BillingService } from './services/billing.service';

@Module({
  imports: [AuditModule, BusinessModule, PlansModule],
  controllers: [PlatformBillingController],
  providers: [BillingService, BusinessSubscriptionRepository],
})
export class BillingModule {}
