import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { Observable, map } from 'rxjs';
import { SKIP_ENVELOPE_KEY } from '../constants';
import { RootConfig } from '@app/core/config/configuration';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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

    const legacyFields =
      (process.env.ENVELOPE_LEGACY_FIELDS ?? 'true').toLowerCase() === 'true';
    const requestId = randomUUID();

    return next.handle().pipe(
      map((payload: unknown) => {
        let data: unknown = payload;
        let meta: Record<string, unknown> = { requestId };

        if (isRecord(payload) && 'data' in payload) {
          data = payload.data;
          if (isRecord(payload.meta)) {
            meta = { ...meta, ...payload.meta };
          }
        } else if (isRecord(payload) && 'items' in payload && 'meta' in payload) {
          data = payload.items;
          if (isRecord(payload.meta)) {
            meta = {
              ...meta,
              ...payload.meta,
              pagination: payload.meta,
            };
          }
        }

        const envelope: Record<string, unknown> = {
          data,
          meta,
          error: null,
        };

        if (legacyFields) {
          envelope.success = true;
          envelope.timestamp = new Date().toISOString();
        }

        return envelope;
      }),
    );
  }
}
