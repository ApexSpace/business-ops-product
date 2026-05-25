import {
  BusinessMemberRole,
  PlatformMemberRole,
} from '@prisma/client';
import { AuthContext } from '../../../common/decorators/current-user.decorator';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  context: AuthContext;
  platformRole?: PlatformMemberRole;
  businessId?: string;
  businessRole?: BusinessMemberRole;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
}
