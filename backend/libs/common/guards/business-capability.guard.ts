import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_CAPABILITY_KEY } from '../decorators/require-capability.decorator';
import { REQUIRE_MODULE_KEY } from '../decorators/require-module.decorator';
import { RequestUser } from '../decorators/current-user.decorator';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../exceptions/error-code.enum';
import { BusinessCapabilityCheckService } from '@app/modules/platform/business/services/business-capability-check.service';

@Injectable()
export class BusinessCapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly capabilityCheck: BusinessCapabilityCheckService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const capabilityKey = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!moduleKey && !capabilityKey) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const user = request.user;

    if (!user?.businessId || user.context !== 'business') {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Business context required',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.platformRole) {
      return true;
    }

    const businessId = user.businessId;

    if (capabilityKey) {
      const allowed = await this.capabilityCheck.hasCapability(
        businessId,
        capabilityKey,
      );
      if (!allowed) {
        throw new AppException(
          ErrorCode.FEATURE_NOT_AVAILABLE,
          'This feature is not included in your current package.',
          HttpStatus.FORBIDDEN,
        );
      }
      return true;
    }

    if (moduleKey) {
      const allowed = await this.capabilityCheck.hasModule(businessId, moduleKey);
      if (!allowed) {
        throw new AppException(
          ErrorCode.FEATURE_NOT_AVAILABLE,
          'This feature is not included in your current package.',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    return true;
  }
}
