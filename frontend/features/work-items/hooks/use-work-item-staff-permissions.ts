"use client";

import { useAuth } from "@/lib/auth/provider";
import { useWorkItemsHost } from "@/features/work-items/work-items-host-context";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";

export function useWorkItemStaffPermissions() {
  const { mode } = useWorkItemsHost();
  const { jwt, user } = useAuth();

  if (mode === "platform") {
    return {
      isAdmin: true,
      canAccess: true,
      canManage: true,
    };
  }

  const role = user?.businessRole ?? jwt?.businessRole;
  const permissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const canAccess =
    isAdmin || hasStaffPermission(permissions, "work_items.access", role);
  const canManage =
    isAdmin || hasStaffPermission(permissions, "work_items.manage", role);

  return {
    isAdmin,
    canAccess,
    canManage,
  };
}
