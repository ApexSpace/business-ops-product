"use client";

import { useAuth } from "@/lib/auth/provider";
import { useFormsHost } from "@/features/forms/forms-host-context";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";

export function useFormStaffPermissions() {
  const { mode } = useFormsHost();
  const { jwt, user } = useAuth();

  if (mode === "platform") {
    return {
      isAdmin: true,
      canViewOwnSubmissions: true,
      canViewAllSubmissions: true,
      canManageTemplates: true,
    };
  }

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
