"use client";

import { useAuth } from "@/lib/auth/provider";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";

export function usePipelineStaffPermissions() {
  const { jwt, user } = useAuth();
  const role = user?.businessRole ?? jwt?.businessRole;
  const permissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const canAccess =
    isAdmin || hasStaffPermission(permissions, "pipelines.access", role);
  const canManage =
    isAdmin || hasStaffPermission(permissions, "pipelines.manage", role);

  return {
    isAdmin,
    canAccess,
    canManage,
  };
}
