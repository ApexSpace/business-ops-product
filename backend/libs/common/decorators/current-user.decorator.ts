import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { BusinessMemberRole, PlatformMemberRole } from '@prisma/client';

export type AuthContext = 'platform' | 'business';

export interface RequestUser {
  id: string;
  email: string;
  context: AuthContext;
  platformRole?: PlatformMemberRole;
  businessId?: string;
  businessRole?: BusinessMemberRole;
  /** Compact true-only staff permissions for MEMBERs (from JWT/membership). */
  staffPermissions?: Record<string, boolean>;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    return request.user;
  },
);
