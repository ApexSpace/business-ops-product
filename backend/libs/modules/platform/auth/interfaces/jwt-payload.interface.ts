import { BusinessMemberRole, PlatformMemberRole } from '@prisma/client';
import { AuthContext } from '@app/common/decorators/current-user.decorator';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  context: AuthContext;
  platformRole?: PlatformMemberRole;
  businessId?: string;
  businessRole?: BusinessMemberRole;
  /** Granted staff permissions (MEMBER role only; omitted for ADMIN/OWNER). */
  staffPermissions?: Record<string, boolean>;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
}
