import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { CheckoutAdvancedSettingsController } from './controllers/checkout-advanced-settings.controller';
import { CheckoutAdvancedSettingsRepository } from './repositories/checkout-advanced-settings.repository';
import { CheckoutAdvancedSettingsService } from './services/checkout-advanced-settings.service';

@Module({
  imports: [AuditModule, forwardRef(() => BusinessModule)],
  controllers: [CheckoutAdvancedSettingsController],
  providers: [
    CheckoutAdvancedSettingsRepository,
    CheckoutAdvancedSettingsService,
  ],
  exports: [CheckoutAdvancedSettingsRepository, CheckoutAdvancedSettingsService],
})
export class CheckoutAdvancedSettingsModule {}
