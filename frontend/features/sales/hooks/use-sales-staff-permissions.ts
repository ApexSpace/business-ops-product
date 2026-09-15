"use client";

import { useAuth } from "@/lib/auth/provider";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";

export function useSalesStaffPermissions() {
  const { jwt, user } = useAuth();
  const role = user?.businessRole ?? jwt?.businessRole;
  const permissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const canViewOnCalendar =
    isAdmin ||
    hasStaffPermission(permissions, "sales.view_on_calendar", role);
  const canViewOwn =
    isAdmin || hasStaffPermission(permissions, "sales.view_own", role);
  const canViewAll =
    isAdmin || hasStaffPermission(permissions, "sales.view_all", role);
  const canAccessSalesApp = canViewOwn || canViewAll;
  const canCheckout =
    isAdmin || hasStaffPermission(permissions, "sales.checkout", role);
  const canSellNonRetail =
    isAdmin ||
    hasStaffPermission(permissions, "sales.sell_non_retail", role);
  const canRefundAll =
    isAdmin || hasStaffPermission(permissions, "sales.refund", role);
  const canRefundOpen =
    isAdmin ||
    canRefundAll ||
    hasStaffPermission(permissions, "sales.refund_open", role);

  return {
    isAdmin,
    canViewOnCalendar,
    canViewOwn,
    canViewAll,
    canAccessSalesApp,
    canCheckout,
    canSellNonRetail,
    canRefundAll,
    canRefundOpen,
  };
}
