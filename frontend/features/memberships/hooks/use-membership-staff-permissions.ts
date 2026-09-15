"use client";

import { useAuth } from "@/lib/auth/provider";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";

export function useMembershipStaffPermissions() {
  const { jwt, user } = useAuth();
  const role = user?.businessRole ?? jwt?.businessRole;
  const permissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const canAccess =
    isAdmin || hasStaffPermission(permissions, "memberships.access", role);
  const canManage =
    isAdmin || hasStaffPermission(permissions, "memberships.manage", role);

  return {
    isAdmin,
    canAccess,
    canManage,
  };
}
