import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../exceptions/error-code.enum';
import { ApiErrorResponse } from '../types/api-error-response.type';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, code, errors } = this.resolveException(exception);

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode: status,
      code,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private resolveException(exception: unknown): {
    status: number;
    message: string;
    code: ErrorCode | string;
    errors?: Record<string, string[]>;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const payload = exceptionResponse as Record<string, unknown>;
        const code =
          typeof payload.code === 'string'
            ? payload.code
            : this.mapStatusToCode(status);
        const message =
          typeof payload.message === 'string'
            ? payload.message
            : Array.isArray(payload.message)
              ? payload.message.join(', ')
              : exception.message;
        const errors =
          typeof payload.errors === 'object' && payload.errors !== null
            ? (payload.errors as Record<string, string[]>)
            : this.formatValidationErrors(payload.message);

        return { status, message, code, errors };
      }

      return {
        status,
        message: exception.message,
        code: this.mapStatusToCode(status),
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      code: ErrorCode.INTERNAL_ERROR,
    };
  }

  private mapStatusToCode(status: number): ErrorCode {
    if (status === Number(HttpStatus.NOT_FOUND)) {
      return ErrorCode.NOT_FOUND;
    }
    if (status === Number(HttpStatus.UNAUTHORIZED)) {
      return ErrorCode.UNAUTHORIZED;
    }
    if (status === Number(HttpStatus.FORBIDDEN)) {
      return ErrorCode.FORBIDDEN;
    }
    if (status === Number(HttpStatus.BAD_REQUEST)) {
      return ErrorCode.BAD_REQUEST;
    }
    return ErrorCode.INTERNAL_ERROR;
  }

  private formatValidationErrors(
    message: unknown,
  ): Record<string, string[]> | undefined {
    if (!Array.isArray(message)) {
      return undefined;
    }

    return { validation: message.map(String) };
  }
}
