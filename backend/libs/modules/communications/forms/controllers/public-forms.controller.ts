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
import { CreateUploadDto } from '@app/modules/storage/dto/create-upload.dto';
import { FailUploadDto } from '@app/modules/storage/dto/fail-upload.dto';
import { ConfirmUploadDto } from '@app/modules/storage/dto/confirm-upload.dto';
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

  @Post(':publicKey/uploads')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  createUpload(
    @Param('publicKey') publicKey: string,
    @Body() dto: CreateUploadDto,
  ) {
    return this.publicFormsService.createUpload(publicKey, dto);
  }

  @Post(':publicKey/uploads/:id/confirm')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  confirmUpload(
    @Param('publicKey') publicKey: string,
    @Param('id') id: string,
    @Body() _dto: ConfirmUploadDto,
  ) {
    return this.publicFormsService.confirmUpload(publicKey, id);
  }

  @Post(':publicKey/uploads/:id/fail')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  failUpload(
    @Param('publicKey') publicKey: string,
    @Param('id') id: string,
    @Body() dto: FailUploadDto,
  ) {
    return this.publicFormsService.failUpload(publicKey, id, dto.reason);
  }

  @Get(':publicKey/files/:id/download-url')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getFileDownloadUrl(
    @Param('publicKey') publicKey: string,
    @Param('id') id: string,
  ) {
    return this.publicFormsService.getFileDownloadUrl(publicKey, id);
  }
}
