import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BusinessModule } from '../business/business.module';
import { PlansModule } from '../plans/plans.module';
import { PlatformBillingController } from './controllers/platform-billing.controller';
import { BusinessSubscriptionRepository } from './repositories/business-subscription.repository';
import { BillingService } from './services/billing.service';

@Module({
  imports: [AuditModule, BusinessModule, PlansModule],
  controllers: [PlatformBillingController],
  providers: [BillingService, BusinessSubscriptionRepository],
})
export class BillingModule {}
