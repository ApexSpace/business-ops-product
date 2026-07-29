"use client";

import { useAuth } from "@/lib/auth/provider";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";

export function useConversationStaffPermissions() {
  const { mode } = useConversationsHost();
  const { jwt, user } = useAuth();

  if (mode === "platform") {
    return {
      isAdmin: true,
      canAccess: true,
      canViewAll: true,
      canSend: true,
    };
  }

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
