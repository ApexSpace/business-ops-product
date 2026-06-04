import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/** Attaches Idempotency-Key to request for async write handlers. */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const key = req.header('idempotency-key') ?? req.header('Idempotency-Key');
    if (key) {
      (req as Request & { idempotencyKey?: string }).idempotencyKey = key;
    }
    next();
  }
}
