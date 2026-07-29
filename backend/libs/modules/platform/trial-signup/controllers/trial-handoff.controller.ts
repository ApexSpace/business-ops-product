import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@app/common/decorators/public.decorator';
import { TrialHandoffExchangeDto } from '../dto/trial-signup.dto';
import { TrialSignupService } from '../services/trial-signup.service';

@ApiTags('auth')
@Controller('auth/trial')
export class TrialHandoffController {
  constructor(private readonly trialSignupService: TrialSignupService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 900000 } })
  @Post('handoff/exchange')
  exchange(@Body() dto: TrialHandoffExchangeDto) {
    return this.trialSignupService.exchangeHandoff(dto.code);
  }
}
