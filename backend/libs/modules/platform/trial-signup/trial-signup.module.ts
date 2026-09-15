import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@app/core/redis/redis.module';
import { IndustriesModule } from '@app/modules/crm/industries/industries.module';
import { TwilioModule } from '@app/modules/integrations/twilio/twilio.module';
import { AuthModule } from '@app/modules/platform/auth/auth.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { PublicTrialController } from './controllers/public-trial.controller';
import { TrialHandoffController } from './controllers/trial-handoff.controller';
import { TrialSignupSessionRepository } from './repositories/trial-signup-session.repository';
import { TrialOtpService } from './services/trial-otp.service';
import { TrialSignupService } from './services/trial-signup.service';

@Module({
  imports: [
    JwtModule.register({}),
    RedisModule,
    TwilioModule,
    IndustriesModule,
    forwardRef(() => AuthModule),
    forwardRef(() => BusinessModule),
  ],
  controllers: [PublicTrialController, TrialHandoffController],
  providers: [
    TrialSignupSessionRepository,
    TrialOtpService,
    TrialSignupService,
  ],
  exports: [TrialSignupService],
})
export class TrialSignupModule {}
