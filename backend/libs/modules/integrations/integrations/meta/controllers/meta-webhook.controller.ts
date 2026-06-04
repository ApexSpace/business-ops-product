import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '@app/common/decorators/public.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
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
  receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
  ): { success: true } {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body is required for Meta webhook verification');
    }
    void     void this.metaWebhookService.handleEvent(rawBody, signature);
    return { success: true };
  }
}
