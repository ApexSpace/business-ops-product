import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@app/common/decorators/public.decorator';
import {
  PublicAppointmentManageAvailabilityQueryDto,
  PublicAppointmentRescheduleDto,
} from '../dto/public-appointment-manage.dto';
import { PublicAppointmentManageService } from '../services/public-appointment-manage.service';

@ApiTags('public-appointment-manage')
@Controller('public/appointments')
export class PublicAppointmentManageController {
  constructor(
    private readonly manageService: PublicAppointmentManageService,
  ) {}

  @Get(':token')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getSummary(@Param('token') token: string) {
    return this.manageService.getSummary(token);
  }

  @Post(':token/cancel')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  cancel(@Param('token') token: string) {
    return this.manageService.cancel(token);
  }

  @Get(':token/availability')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getAvailability(
    @Param('token') token: string,
    @Query() query: PublicAppointmentManageAvailabilityQueryDto,
  ) {
    return this.manageService.getAvailability(token, query);
  }

  @Patch(':token/reschedule')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  reschedule(
    @Param('token') token: string,
    @Body() dto: PublicAppointmentRescheduleDto,
  ) {
    return this.manageService.reschedule(token, dto);
  }
}
