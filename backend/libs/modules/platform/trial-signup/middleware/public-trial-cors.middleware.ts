import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const PUBLIC_TRIAL_PATH_PREFIXES = [
  '/public/trial',
  '/api/v1/public/trial',
  '/embed/trial-widget.js',
  '/api/v1/embed/trial-widget.js',
];

function isPublicTrialPath(path: string): boolean {
  return PUBLIC_TRIAL_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Force any-origin CORS for trial embed APIs so marketing sites keep working
 * even when global CORS_ORIGIN is locked to the app domain.
 */
@Injectable()
export class PublicTrialCorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path || req.url || '';
    if (!isPublicTrialPath(path)) {
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
  }
}
