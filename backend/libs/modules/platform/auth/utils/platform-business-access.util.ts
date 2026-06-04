import {
  BusinessMemberRole,
  PlatformMemberRole,
} from '@prisma/client';

export function isPlatformBusinessAdmin(
  platformRole: PlatformMemberRole,
): boolean {
  return (
    platformRole === PlatformMemberRole.SUPER_ADMIN ||
    platformRole === PlatformMemberRole.PLATFORM_ADMIN
  );
}

/** Effective business role when a platform admin operates inside a business context. */
export function resolvePlatformBusinessRole(
  platformRole: PlatformMemberRole,
  membershipRole?: BusinessMemberRole | null,
): BusinessMemberRole {
  if (!membershipRole) {
    return BusinessMemberRole.ADMIN;
  }
  if (
    isPlatformBusinessAdmin(platformRole) &&
    membershipRole === BusinessMemberRole.MEMBER
  ) {
    return BusinessMemberRole.ADMIN;
  }
  return membershipRole;
}
