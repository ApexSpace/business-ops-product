import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '@app/common/interceptors/transform.interceptor';
import { RootConfig } from '@app/core/config/configuration';
import {
  isRealtimeWebSocketEnabled,
  resolveRealtimeConfig,
} from '@app/core/realtime/realtime.config';
import { RealtimeIoAdapter } from '@app/core/realtime/realtime-io.adapter';
import { ApiModule } from './api.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiModule, {
    rawBody: true,
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService<RootConfig, true>);
  const apiPrefix = configService.get('app.apiPrefix', { infer: true });
  const port = configService.get('app.port', { infer: true });
  const corsOrigin = configService.get('app.corsOrigin', { infer: true });

  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      { path: 'widgets/chatbot.js', method: RequestMethod.GET },
      { path: 'widgets/chatbot/:publicKey', method: RequestMethod.GET },
      { path: 'widgets/form.js', method: RequestMethod.GET },
      { path: 'widgets/form-embed-runtime.js', method: RequestMethod.GET },
      { path: 'widgets/form/:publicKey', method: RequestMethod.GET },
      { path: 'public/pricing/:id', method: RequestMethod.GET },
      { path: 'embed/pricing/:id', method: RequestMethod.GET },
      { path: 'embed/pricing-widget.js', method: RequestMethod.GET },
      { path: 'embed/trial-widget.js', method: RequestMethod.GET },
      { path: 'public/trial/embed', method: RequestMethod.GET },
      { path: 'public/trial/session', method: RequestMethod.POST },
      { path: 'public/trial/phone/send-otp', method: RequestMethod.POST },
      { path: 'public/trial/phone/verify-otp', method: RequestMethod.POST },
      { path: 'public/trial/complete', method: RequestMethod.POST },
    ],
  });

  // Path-scoped any-origin CORS for trial embeds (before global CORS).
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path || '';
    const isTrial =
      path.startsWith('/public/trial') ||
      path.startsWith(`/${apiPrefix}/public/trial`) ||
      path === '/embed/trial-widget.js' ||
      path === `/${apiPrefix}/embed/trial-widget.js`;
    if (!isTrial) {
      next();
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Idempotency-Key',
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    credentials: true,
  });

  if (isRealtimeWebSocketEnabled()) {
    const realtimeConfig = resolveRealtimeConfig(process.env);
    app.useWebSocketAdapter(
      new RealtimeIoAdapter(app, realtimeConfig.corsOrigin),
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(app.get(TransformInterceptor));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Business Automation API')
    .setDescription('API v1 — scalable NestJS monorepo')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  if (process.env.WRITE_OPENAPI === 'true') {
    const fs = await import('fs');
    fs.writeFileSync('openapi.json', JSON.stringify(document, null, 2));
    await app.close();
    return;
  }

  await app.listen(port);
}

void bootstrap();
