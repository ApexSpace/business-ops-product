import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { TimeClockController } from './controllers/time-clock.controller';
import { TimeCardsController } from './controllers/time-cards.controller';
import { TimeCardRepository } from './repositories/time-card.repository';
import { TimeClockKioskService } from './services/time-clock-kiosk.service';
import { TimeCardsService } from './services/time-cards.service';

@Module({
  imports: [AuditModule, BusinessModule, MembershipModule],
  controllers: [TimeClockController, TimeCardsController],
  providers: [TimeCardRepository, TimeClockKioskService, TimeCardsService],
  exports: [TimeCardRepository, TimeCardsService],
})
export class TimeClockModule {}
