import {
  Body,
  Controller,
  Get,
  Header,
  Ip,
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Public } from '@app/common/decorators/public.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import {
  CreateOrUpdateTrialSessionDto,
  TrialCompleteDto,
  TrialSendOtpDto,
  TrialVerifyOtpDto,
} from '../dto/trial-signup.dto';
import { TrialSignupService } from '../services/trial-signup.service';

@ApiTags('public-trial')
@Controller()
export class PublicTrialController {
  private readonly widgetScriptBody: string;

  constructor(private readonly trialSignupService: TrialSignupService) {
    const candidates = [
      join(process.cwd(), 'assets', 'embed', 'trial-widget.js'),
      join(process.cwd(), 'dist', 'assets', 'embed', 'trial-widget.js'),
      join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'assets',
        'embed',
        'trial-widget.js',
      ),
    ];
    this.widgetScriptBody = '';
    for (const scriptPath of candidates) {
      try {
        this.widgetScriptBody = readFileSync(scriptPath, 'utf8');
        break;
      } catch {
        /* try next */
      }
    }
  }

  @Post('public/trial/session')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 900000 } })
  createOrUpdateSession(@Body() dto: CreateOrUpdateTrialSessionDto) {
    return this.trialSignupService.createOrUpdateSession(dto);
  }

  @Post('public/trial/phone/send-otp')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  sendOtp(@Body() dto: TrialSendOtpDto, @Ip() ip?: string) {
    return this.trialSignupService.sendOtp({
      phoneE164: dto.phoneE164,
      sessionId: dto.sessionId,
      ip: ip ?? 'unknown',
    });
  }

  @Post('public/trial/phone/verify-otp')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 900000 } })
  verifyOtp(@Body() dto: TrialVerifyOtpDto, @Ip() ip?: string) {
    return this.trialSignupService.verifyOtp({
      phoneE164: dto.phoneE164,
      code: dto.code,
      ip: ip ?? 'unknown',
    });
  }

  @Post('public/trial/complete')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  complete(@Body() dto: TrialCompleteDto, @Ip() ip?: string) {
    return this.trialSignupService.complete(dto, ip ?? 'unknown');
  }

  @Get('public/trial/embed')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getEmbed() {
    return this.trialSignupService.getEmbedSnippet();
  }

  @Get('embed/trial-widget.js')
  @Public()
  @SkipEnvelope()
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  serveWidgetScript(@Res() res: Response): void {
    if (!this.widgetScriptBody) {
      res.status(404).send('// trial-widget.js not found');
      return;
    }
    res.send(this.widgetScriptBody);
  }
}
