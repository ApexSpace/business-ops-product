import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Public } from '@app/common/decorators/public.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { PublicPricingDto } from '../dto';
import { PlanEmbedService } from '../services/plan-embed.service';
import { PlanGroupsRepository } from '../repositories/plan-groups.repository';

@ApiTags('public-pricing')
@Controller()
export class PublicPricingController {
  private readonly widgetScriptBody: string;

  constructor(
    private readonly embedService: PlanEmbedService,
    private readonly repository: PlanGroupsRepository,
  ) {
    const candidates = [
      join(process.cwd(), 'assets', 'embed', 'pricing-widget.js'),
      join(process.cwd(), 'dist', 'assets', 'embed', 'pricing-widget.js'),
      join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'assets',
        'embed',
        'pricing-widget.js',
      ),
    ];
    this.widgetScriptBody = '';
    for (const scriptPath of candidates) {
      try {
        this.widgetScriptBody = readFileSync(scriptPath, 'utf8');
        break;
      } catch {
        /* try next path */
      }
    }
  }

  @Get('public/pricing/:id')
  @Public()
  @SkipEnvelope()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getPublicPricing(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicPricingDto> {
    return this.embedService.buildPublicPricing(id);
  }

  @Get('embed/pricing-widget.js')
  @Public()
  @SkipEnvelope()
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  serveWidgetScript(@Res() res: Response): void {
    if (!this.widgetScriptBody) {
      res.status(404).send('// pricing-widget.js not found');
      return;
    }
    res.send(this.widgetScriptBody);
  }

  @Get('embed/pricing/:id')
  @Public()
  @SkipEnvelope()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async getEmbedHtml(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const dto = await this.embedService.buildEmbedPricing(id);
    const group = await this.repository.findByIdForPricing(id);
    const customCss = group?.embedSettings?.customCss ?? null;
    res.send(this.embedService.renderEmbedHtml(dto, customCss));
  }
}
