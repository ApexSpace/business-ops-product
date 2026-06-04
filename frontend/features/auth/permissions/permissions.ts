import {
  canCreateBusiness,
  canDeleteBusiness,
  canInviteMember,
  canManageBilling,
  canManageBusinessSettings,
  canManageIndustries,
  canManagePipelines,
  canManagePlatformSettings,
  canManagePlatformUsers,
  canManagePlans,
  canUpdateBusiness,
} from "./permissions-legacy";
import type {
  AuthContextItem,
  BusinessMemberRole,
  JwtAccessPayload,
  PlatformMemberRole,
} from "@/features/auth/types/auth-dto";

export const PERMISSIONS = {
  "contacts.create": "contacts.create",
  "contacts.update": "contacts.update",
  "contacts.delete": "contacts.delete",
  "conversations.send": "conversations.send",
  "integrations.manage": "integrations.manage",
  "pipelines.manage": "pipelines.manage",
  "members.invite": "members.invite",
  "settings.business": "settings.business",
  "platform.businesses.create": "platform.businesses.create",
  "platform.businesses.update": "platform.businesses.update",
  "platform.businesses.delete": "platform.businesses.delete",
  "platform.users.manage": "platform.users.manage",
  /** Remove non–super-admin platform users (SUPER_ADMIN only). */
  "platform.users.remove": "platform.users.remove",
  "platform.plans.manage": "platform.plans.manage",
  "platform.industries.manage": "platform.industries.manage",
  "platform.billing.manage": "platform.billing.manage",
  "platform.settings.manage": "platform.settings.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function evaluatePermission(
  permission: Permission,
  jwt?: JwtAccessPayload | null,
  contexts?: AuthContextItem[],
): boolean {
  if (!jwt) return false;

  switch (permission) {
    case PERMISSIONS["contacts.create"]:
    case PERMISSIONS["contacts.update"]:
    case PERMISSIONS["contacts.delete"]:
    case PERMISSIONS["conversations.send"]:
      return jwt.context === "business";
    case PERMISSIONS["integrations.manage"]:
    case PERMISSIONS["settings.business"]:
      return canManageBusinessSettings(jwt, contexts);
    case PERMISSIONS["pipelines.manage"]:
      return canManagePipelines(jwt, contexts);
    case PERMISSIONS["members.invite"]:
      return canInviteMember(jwt, contexts);
    case PERMISSIONS["platform.businesses.create"]:
      return canCreateBusiness(jwt.platformRole);
    case PERMISSIONS["platform.businesses.update"]:
      return canUpdateBusiness(jwt.platformRole);
    case PERMISSIONS["platform.businesses.delete"]:
      return canDeleteBusiness(jwt.platformRole);
    case PERMISSIONS["platform.users.manage"]:
      return canManagePlatformUsers(jwt.platformRole);
    case PERMISSIONS["platform.users.remove"]:
      return jwt.platformRole === "SUPER_ADMIN";
    case PERMISSIONS["platform.plans.manage"]:
      return canManagePlans(jwt.platformRole);
    case PERMISSIONS["platform.industries.manage"]:
      return canManageIndustries(jwt.platformRole);
    case PERMISSIONS["platform.billing.manage"]:
      return canManageBilling(jwt.platformRole);
    case PERMISSIONS["platform.settings.manage"]:
      return canManagePlatformSettings(jwt.platformRole);
    default:
      return false;
  }
}

export function roleLabels(payload: JwtAccessPayload | null): {
  platformRole?: PlatformMemberRole;
  businessRole?: BusinessMemberRole;
} {
  return {
    platformRole: payload?.platformRole,
    businessRole: payload?.businessRole,
  };
}
