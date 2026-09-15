import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { RedisModule } from '@app/core/redis/redis.module';
import { OffersController } from './controllers/offers.controller';
import { OffersPublicController } from './controllers/offers-public.controller';
import { OfferRepository } from './repositories/offer.repository';
import { OfferCacheService } from './services/offer-cache.service';
import { OfferEvaluationService } from './services/offer-evaluation.service';
import { OffersService } from './services/offers.service';

@Module({
  imports: [AuditModule, RedisModule, forwardRef(() => BusinessModule)],
  controllers: [OffersController, OffersPublicController],
  providers: [
    OfferRepository,
    OfferCacheService,
    OffersService,
    OfferEvaluationService,
  ],
  exports: [OffersService, OfferEvaluationService, OfferRepository],
})
export class OffersModule {}
