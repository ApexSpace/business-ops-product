import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../../../common/decorators/public.decorator';
import { SkipEnvelope } from '../../../../common/decorators/skip-envelope.decorator';
import { MetaWebhookService } from '../services/meta-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks/meta')
export class MetaWebhookController {
  constructor(private readonly metaWebhookService: MetaWebhookService) {}

  @Get()
  @Public()
  @SkipEnvelope()
  async verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.metaWebhookService.verifyChallenge(
      mode,
      token,
      challenge,
    );
    if (result === null) {
      res.status(403).send('Forbidden');
      return;
    }
    res.status(200).send(result);
  }

  @Post()
  @Public()
  @SkipEnvelope()
  @HttpCode(200)
  async receive(@Body() body: Record<string, unknown>): Promise<{ success: true }> {
    await this.metaWebhookService.handleEvent(body);
    return { success: true };
  }
}
