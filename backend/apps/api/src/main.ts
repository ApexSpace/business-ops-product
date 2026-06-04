import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '@app/common/interceptors/transform.interceptor';
import { RootConfig } from '@app/core/config/configuration';
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

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    credentials: true,
  });

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
  }

  await app.listen(port);
}

void bootstrap();
