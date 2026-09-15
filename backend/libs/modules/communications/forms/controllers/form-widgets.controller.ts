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
import { FormWidgetPageService } from '../services/form-widget-page.service';

@ApiTags('form-widgets')
@Controller('widgets')
export class FormWidgetsController {
  private readonly scriptBody: string;
  private readonly runtimeScriptBody: string;

  constructor(private readonly widgetPage: FormWidgetPageService) {
    this.scriptBody = this.readAsset('form.js');
    this.runtimeScriptBody = this.readAsset('form-embed-runtime.js');
  }

  private readAsset(fileName: string): string {
    const candidates = [
      join(process.cwd(), 'assets', 'widgets', fileName),
      join(process.cwd(), 'dist', 'assets', 'widgets', fileName),
      join(__dirname, '..', '..', '..', '..', 'assets', 'widgets', fileName),
    ];
    for (const scriptPath of candidates) {
      try {
        return readFileSync(scriptPath, 'utf8');
      } catch {
        /* try next path */
      }
    }
    return '';
  }

  @Get('form.js')
  @Public()
  @SkipEnvelope()
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  serveScript(@Res() res: Response): void {
    if (!this.scriptBody) {
      res.status(404).send('// form.js not found');
      return;
    }
    res.send(this.scriptBody);
  }

  @Get('form-embed-runtime.js')
  @Public()
  @SkipEnvelope()
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  serveRuntimeScript(@Res() res: Response): void {
    if (!this.runtimeScriptBody) {
      res.status(404).send('// form-embed-runtime.js not found');
      return;
    }
    res.send(this.runtimeScriptBody);
  }

  @Get('form/:publicKey')
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
