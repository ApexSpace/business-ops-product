import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { OperationsModule } from '@app/modules/platform/operations/operations.module';
import { StripePlatformBillingModule } from '@app/modules/platform/billing/stripe/stripe-platform-billing.module';
import { PlatformTiersController } from './controllers/platform-tiers.controller';
import { TiersService } from './services/tiers.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => OperationsModule),
    forwardRef(() => StripePlatformBillingModule),
  ],
  controllers: [PlatformTiersController],
  providers: [TiersService],
  exports: [TiersService],
})
export class TiersModule {}
