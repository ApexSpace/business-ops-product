import { HttpStatus, Injectable } from '@nestjs/common';
import { CapabilityFeatureSource } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { isAllowedBusinessRoute } from '@app/modules/platform/snapshots/registries/business-route.registry';

const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;

export type RouteValidationResult = {
  valid: boolean;
  warning?: string;
  error?: string;
};

@Injectable()
export class CapabilityValidationService {
  validateKey(key: string, field = 'key'): void {
    if (!KEY_PATTERN.test(key)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `${field} must be lowercase dot-separated (e.g. crm.contacts)`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  validateRoute(
    route: string,
    options?: { strict?: boolean; source?: CapabilityFeatureSource },
  ): RouteValidationResult {
    if (isAllowedBusinessRoute(route)) {
      return { valid: true };
    }

    const message = `Route "${route}" is not in the business route registry`;

    if (options?.strict) {
      return { valid: false, error: message };
    }

    return { valid: true, warning: message };
  }

  validateJsonSchema(
    schemaJson: unknown,
    field = 'schemaJson',
  ): Record<string, unknown> {
    if (
      schemaJson === null ||
      typeof schemaJson !== 'object' ||
      Array.isArray(schemaJson)
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `${field} must be a JSON object`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return schemaJson as Record<string, unknown>;
  }

  validateOptionalJson(
    value: unknown,
    field: string,
  ): Record<string, unknown> | undefined {
    if (value === undefined) return undefined;
    return this.validateJsonSchema(value, field);
  }
}
