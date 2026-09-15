"use client";

import { useAuth } from "@/lib/auth/provider";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";

export function useContactStaffPermissions() {
  const { jwt, user } = useAuth();
  const role = user?.businessRole ?? jwt?.businessRole;
  const permissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const canOpenProfiles =
    isAdmin || hasStaffPermission(permissions, "contacts.access", role);
  const canViewLastNames =
    isAdmin ||
    hasStaffPermission(permissions, "contacts.view_last_names", role);
  const canViewContactDetails =
    isAdmin ||
    hasStaffPermission(permissions, "contacts.view_contact_details", role);
  const canManage =
    isAdmin || hasStaffPermission(permissions, "contacts.manage", role);
  const canDeleteMerge =
    isAdmin ||
    hasStaffPermission(permissions, "contacts.delete_merge", role);
  const canAdjustBalances =
    isAdmin ||
    hasStaffPermission(permissions, "contacts.adjust_balances", role);

  return {
    isAdmin,
    canOpenProfiles,
    canViewLastNames,
    canViewContactDetails,
    canManage,
    canDeleteMerge,
    canAdjustBalances,
  };
}
