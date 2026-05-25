import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { SKIP_ENVELOPE_KEY } from '../constants';
import { RootConfig } from '../../config/configuration';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipEnvelope = this.reflector.getAllAndOverride<boolean>(
      SKIP_ENVELOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipEnvelope) {
      return next.handle();
    }

    const enabled = this.configService.get('app.enableResponseEnvelope', {
      infer: true,
    });

    if (!enabled) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
