"use client";

import { useAuth } from "@/lib/auth/provider";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";

export function useFormStaffPermissions() {
  const { jwt, user } = useAuth();
  const role = user?.businessRole ?? jwt?.businessRole;
  const permissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const canViewOwnSubmissions =
    isAdmin ||
    hasStaffPermission(permissions, "forms.view_own_submissions", role);
  const canViewAllSubmissions =
    isAdmin ||
    hasStaffPermission(permissions, "forms.view_all_submissions", role);
  const canManageTemplates =
    isAdmin ||
    hasStaffPermission(permissions, "forms.manage_templates", role);

  return {
    isAdmin,
    canViewOwnSubmissions,
    canViewAllSubmissions,
    canManageTemplates,
  };
}
