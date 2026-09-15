"use client";

import { useAuth } from "@/lib/auth/provider";
import {
  canViewAllStaffCalendars,
  hasStaffPermission,
} from "@/features/team/permissions/staff-permissions";

export function useCalendarStaffPermissions() {
  const { jwt, user } = useAuth();
  const role = user?.businessRole ?? jwt?.businessRole;
  // Prefer live permissions from /auth/me (DB-backed) over stale access-token claims.
  const permissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const canAccess = isAdmin || hasStaffPermission(permissions, "appointments.access", role);
  const canChangeStatus =
    isAdmin ||
    hasStaffPermission(permissions, "appointments.change_status", role);
  const canManageOwn =
    isAdmin || hasStaffPermission(permissions, "appointments.manage_own", role);
  const canViewOthers = isAdmin || canViewAllStaffCalendars(permissions, role);
  const canManageOthers =
    isAdmin || hasStaffPermission(permissions, "appointments.manage_all", role);
  const canManageOwnTimeBlocks =
    isAdmin ||
    hasStaffPermission(permissions, "appointments.manage_own_time_blocks", role);
  const canManageOthersTimeBlocks =
    isAdmin ||
    hasStaffPermission(
      permissions,
      "appointments.manage_all_time_blocks",
      role,
    );
  const canManageWaitlist =
    isAdmin ||
    hasStaffPermission(permissions, "appointments.manage_waitlist", role);
  const canViewHistory =
    isAdmin ||
    hasStaffPermission(permissions, "appointments.view_history", role);

  const isMemberOnlyView = role === "MEMBER" && !canViewOthers;

  function canManageAppointmentOnStaff(assignedToId?: string | null): boolean {
    if (isAdmin) return true;
    if (!assignedToId || assignedToId === user?.id) return canManageOwn;
    return canManageOthers;
  }

  function canManageTimeBlockOnStaff(assignedToId?: string | null): boolean {
    if (isAdmin) return true;
    if (!assignedToId || assignedToId === user?.id) {
      return canManageOwnTimeBlocks;
    }
    return canManageOthersTimeBlocks;
  }

  return {
    userId: user?.id,
    isAdmin,
    canAccess,
    canChangeStatus,
    canManageOwn,
    canViewOthers,
    canManageOthers,
    canManageOwnTimeBlocks,
    canManageOthersTimeBlocks,
    canManageWaitlist,
    canViewHistory,
    isMemberOnlyView,
    canCreateAnyAppointment: canManageOwn || canManageOthers,
    canCreateAnyTimeBlock: canManageOwnTimeBlocks || canManageOthersTimeBlocks,
    canManageAppointmentOnStaff,
    canManageTimeBlockOnStaff,
  };
}
