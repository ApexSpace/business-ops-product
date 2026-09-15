import { Module, forwardRef } from '@nestjs/common';
import { EmailModule } from '@app/modules/communications/email/email.module';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { StripePlatformBillingModule } from '@app/modules/platform/billing/stripe/stripe-platform-billing.module';
import { PlatformOperationsController } from './controllers/platform-operations.controller';
import { EntitlementChangeDiffService } from './services/entitlement-change-diff.service';
import { OperationsCampaignService } from './services/operations-campaign.service';

@Module({
  imports: [
    AuditModule,
    EmailModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => StripePlatformBillingModule),
  ],
  controllers: [PlatformOperationsController],
  providers: [OperationsCampaignService, EntitlementChangeDiffService],
  exports: [OperationsCampaignService, EntitlementChangeDiffService],
})
export class OperationsModule {}
