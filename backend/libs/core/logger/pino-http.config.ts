import type { IncomingMessage, ServerResponse } from 'http';
import type { Options } from 'pino-http';

const logLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
const isDev = process.env.NODE_ENV !== 'production';

type ReqWithId = IncomingMessage & { id?: number | string };

/** Long-lived SSE and cheap health probes — silent unless LOG_LEVEL=debug. */
export function isLowNoiseHttpPath(url: string): boolean {
  return (
    url.includes('/health') ||
    (url.includes('/realtime/') && url.includes('/events'))
  );
}

export function buildPinoHttpConfig(): Options {
  return {
    level: logLevel,
    quietReqLogger: true,
    quietResLogger: true,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'res.headers["set-cookie"]',
        'res.headers["Set-Cookie"]',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      req(req: ReqWithId) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
    customSuccessMessage(req, res, responseTime) {
      const id = (req as ReqWithId).id ?? '-';
      return `${req.method} ${req.url} ${res.statusCode} ${responseTime}ms reqId=${id}`;
    },
    customErrorMessage(req, res, err) {
      const id = (req as ReqWithId).id ?? '-';
      const status = res.statusCode ?? 500;
      return `${req.method} ${req.url} ${status} err=${err.message} reqId=${id}`;
    },
    customLogLevel(
      req: IncomingMessage,
      res: ServerResponse,
      err?: Error,
    ): 'silent' | 'debug' | 'info' | 'warn' | 'error' {
      if (err) return 'error';
      const url = req.url ?? '';
      if (isLowNoiseHttpPath(url)) {
        return logLevel === 'debug' ? 'debug' : 'silent';
      }
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname,req,res,responseTime,context',
            messageFormat: '{msg}',
          },
        }
      : undefined,
  };
}
