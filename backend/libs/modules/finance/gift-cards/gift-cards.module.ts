import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { NotificationsModule } from '@app/modules/communications/notifications/notifications.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { StorageModule } from '@app/modules/storage/storage.module';
import { GiftCardsController } from './controllers/gift-cards.controller';
import { GiftCardsPublicController } from './controllers/gift-cards-public.controller';
import { GiftCardPromotionRepository } from './repositories/gift-card-promotion.repository';
import { GiftCardRepository } from './repositories/gift-card.repository';
import { GiftCardSettingsRepository } from './repositories/gift-card-settings.repository';
import { GiftCardEmailService } from './services/gift-card-email.service';
import { GiftCardNumberService } from './services/gift-card-number.service';
import { GiftCardOnlineCheckoutService } from './services/gift-card-online-checkout.service';
import { GiftCardPromotionsService } from './services/gift-card-promotions.service';
import { GiftCardRedemptionService } from './services/gift-card-redemption.service';
import { GiftCardReportsService } from './services/gift-card-reports.service';
import { GiftCardSettingsService } from './services/gift-card-settings.service';
import { GiftCardsService } from './services/gift-cards.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => ContactsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => IntegrationsModule),
    StorageModule,
  ],
  controllers: [GiftCardsController, GiftCardsPublicController],
  providers: [
    GiftCardRepository,
    GiftCardSettingsRepository,
    GiftCardPromotionRepository,
    GiftCardNumberService,
    GiftCardSettingsService,
    GiftCardPromotionsService,
    GiftCardRedemptionService,
    GiftCardEmailService,
    GiftCardsService,
    GiftCardOnlineCheckoutService,
    GiftCardReportsService,
  ],
  exports: [
    GiftCardsService,
    GiftCardRedemptionService,
    GiftCardSettingsService,
    GiftCardOnlineCheckoutService,
    GiftCardNumberService,
  ],
})
export class GiftCardsModule {}
