import { Module, forwardRef } from '@nestjs/common';
import { EmailModule } from '@app/modules/communications/email/email.module';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { OperationsModule } from '@app/modules/platform/operations/operations.module';
import { StripePlatformBillingModule } from '@app/modules/platform/billing/stripe/stripe-platform-billing.module';
import { PlatformAddonsController } from './controllers/platform-addons.controller';
import { AddonsService } from './services/addons.service';

@Module({
  imports: [
    AuditModule,
    EmailModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => OperationsModule),
    forwardRef(() => StripePlatformBillingModule),
  ],
  controllers: [PlatformAddonsController],
  providers: [AddonsService],
  exports: [AddonsService],
})
export class AddonsModule {}
