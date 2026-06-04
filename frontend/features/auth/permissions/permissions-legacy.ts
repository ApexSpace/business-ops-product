import type {
  AuthContextItem,
  BusinessMemberRole,
  JwtAccessPayload,
  PlatformMemberRole,
} from "@/lib/types/shared";

export function canCreateBusiness(role?: PlatformMemberRole): boolean {
  return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN";
}

export function canUpdateBusiness(role?: PlatformMemberRole): boolean {
  return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN";
}

export function canDeleteBusiness(role?: PlatformMemberRole): boolean {
  return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN";
}

export function canManagePlatformUsers(role?: PlatformMemberRole): boolean {
  return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN";
}

export function canManagePlans(role?: PlatformMemberRole): boolean {
  return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN";
}

export function canManageIndustries(role?: PlatformMemberRole): boolean {
  return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN";
}

export function canManageBilling(role?: PlatformMemberRole): boolean {
  return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN";
}

export function canManagePlatformSettings(role?: PlatformMemberRole): boolean {
  return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN";
}

function isPlatformAdminRole(role?: PlatformMemberRole): boolean {
  return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN";
}

/** Platform super/platform admins operating in a business context. */
export function hasPlatformBusinessAdminAccess(
  jwt?: JwtAccessPayload | null,
  contexts?: AuthContextItem[],
): boolean {
  if (!jwt) return false;
  if (isPlatformAdminRole(jwt.platformRole)) return true;
  if (jwt.context !== "business" || !jwt.businessId || !contexts?.length) {
    return false;
  }
  const businessContext = contexts.find(
    (c) => c.type === "business" && c.businessId === jwt.businessId,
  );
  if (!businessContext?.viaPlatform) return false;
  const platformContext = contexts.find((c) => c.type === "platform");
  return isPlatformAdminRole(platformContext?.platformRole);
}

function hasBusinessAdminRole(role?: BusinessMemberRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canInviteMember(
  jwt?: JwtAccessPayload | null,
  contexts?: AuthContextItem[],
): boolean {
  if (hasPlatformBusinessAdminAccess(jwt, contexts)) return true;
  return hasBusinessAdminRole(jwt?.businessRole);
}

/** Pipelines, stages, and lead assignment management. */
export function canManagePipelines(
  jwt?: JwtAccessPayload | null,
  contexts?: AuthContextItem[],
): boolean {
  if (hasPlatformBusinessAdminAccess(jwt, contexts)) return true;
  return hasBusinessAdminRole(jwt?.businessRole);
}

export function canManageBusinessSettings(
  jwt?: JwtAccessPayload | null,
  contexts?: AuthContextItem[],
): boolean {
  if (hasPlatformBusinessAdminAccess(jwt, contexts)) return true;
  return hasBusinessAdminRole(jwt?.businessRole);
}

export function getActiveRoles(payload: JwtAccessPayload | null) {
  return {
    platformRole: payload?.platformRole,
    businessRole: payload?.businessRole,
  };
}
