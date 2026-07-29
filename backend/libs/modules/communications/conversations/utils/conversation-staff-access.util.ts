import { HttpStatus } from '@nestjs/common';
import { BusinessMemberRole, PlatformMemberRole } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { hasStaffPermission } from '@app/modules/platform/membership/permissions/staff-permission.registry';

export type ConversationAssigneeShape = {
  assignedToUserId?: string | null;
};

const PLATFORM_VIEW_ALL_ROLES = new Set<PlatformMemberRole>([
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
]);

function isBusinessAdminRole(role?: string | null): boolean {
  return (
    role === BusinessMemberRole.OWNER || role === BusinessMemberRole.ADMIN
  );
}

function isPlatformViewAllRole(role?: PlatformMemberRole | null): boolean {
  return role != null && PLATFORM_VIEW_ALL_ROLES.has(role);
}

/** OWNER/ADMIN, platform ops roles, or staff with conversations.view_all. */
export function canViewAllConversations(user?: RequestUser): boolean {
  if (!user) return false;
  if (isPlatformViewAllRole(user.platformRole)) return true;
  if (isBusinessAdminRole(user.businessRole)) return true;
  return hasStaffPermission(
    user.staffPermissions,
    'conversations.view_all',
    user.businessRole,
  );
}

export function canViewConversation(
  user: RequestUser | undefined,
  conversation: ConversationAssigneeShape,
): boolean {
  if (!user) return false;
  if (canViewAllConversations(user)) return true;
  return conversation.assignedToUserId === user.id;
}

export function assertCanViewConversation(
  user: RequestUser | undefined,
  conversation: ConversationAssigneeShape,
): void {
  if (canViewConversation(user, conversation)) return;
  throw new AppException(
    ErrorCode.FORBIDDEN,
    'You do not have permission to view this conversation',
    HttpStatus.FORBIDDEN,
  );
}

/**
 * When the actor cannot view all conversations, force list scope to
 * conversations assigned to them (Mangomint-style assigned inbox).
 */
export function resolveAssignedConversationScope(
  user: RequestUser | undefined,
  options?: { assignedToMe?: boolean },
): { assignedToUserId?: string; assignedToMe?: boolean } {
  if (!user || canViewAllConversations(user)) {
    return {
      assignedToMe: options?.assignedToMe,
    };
  }
  return { assignedToUserId: user.id };
}
