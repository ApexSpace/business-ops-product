import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Public } from '@app/common/decorators/public.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { ChatbotWidgetPageService } from '../services/chatbot-widget-page.service';

@ApiTags('chatbot-widgets')
@Controller('widgets')
export class ChatbotWidgetsController {
  private readonly scriptBody: string;

  constructor(private readonly widgetPage: ChatbotWidgetPageService) {
    const candidates = [
      join(process.cwd(), 'assets', 'widgets', 'chatbot.js'),
      join(process.cwd(), 'dist', 'assets', 'widgets', 'chatbot.js'),
      join(__dirname, '..', '..', '..', '..', 'assets', 'widgets', 'chatbot.js'),
    ];
    this.scriptBody = '';
    for (const scriptPath of candidates) {
      try {
        this.scriptBody = readFileSync(scriptPath, 'utf8');
        break;
      } catch {
        /* try next path */
      }
    }
  }

  @Get('chatbot.js')
  @Public()
  @SkipEnvelope()
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  serveScript(@Res() res: Response): void {
    if (!this.scriptBody) {
      res.status(404).send('// chatbot.js not found');
      return;
    }
    res.send(this.scriptBody);
  }

  @Get('chatbot/:publicKey')
  @Public()
  @SkipEnvelope()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  serveWidget(
    @Param('publicKey') publicKey: string,
    @Res() res: Response,
  ): void {
    if (!publicKey?.trim()) {
      throw new NotFoundException();
    }
    res.send(this.widgetPage.renderWidgetPage(publicKey.trim()));
  }
}
