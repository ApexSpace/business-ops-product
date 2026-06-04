import { ErrorCode } from '../exceptions/error-code.enum';

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  code: ErrorCode | string;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
  path: string;
}
