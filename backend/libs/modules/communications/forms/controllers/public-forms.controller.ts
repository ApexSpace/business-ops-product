import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@app/common/decorators/public.decorator';
import { SubmitFormDto } from '../dto/submit-form.dto';
import { PublicFormsService } from '../services/public-forms.service';

@ApiTags('public-forms')
@Controller('public/forms')
export class PublicFormsController {
  constructor(private readonly publicFormsService: PublicFormsService) {}

  @Get(':publicKey/config')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getConfig(@Param('publicKey') publicKey: string) {
    return this.publicFormsService.getConfig(publicKey);
  }

  @Post(':publicKey/submissions')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  submit(
    @Param('publicKey') publicKey: string,
    @Body() dto: SubmitFormDto,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
    @Ip() ip?: string,
  ) {
    return this.publicFormsService.submit(publicKey, dto, {
      ip,
      userAgent,
      referer,
    });
  }
}
