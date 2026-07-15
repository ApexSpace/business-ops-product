"use client";

import { useAuth } from "@/lib/auth/provider";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";

export function useConversationStaffPermissions() {
  const { jwt, user } = useAuth();
  const role = user?.businessRole ?? jwt?.businessRole;
  const permissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const canAccess =
    isAdmin || hasStaffPermission(permissions, "conversations.access", role);
  const canViewAll =
    isAdmin ||
    hasStaffPermission(permissions, "conversations.view_all", role);
  const canSend =
    isAdmin || hasStaffPermission(permissions, "conversations.send", role);

  return {
    isAdmin,
    canAccess,
    canViewAll,
    canSend,
  };
}
