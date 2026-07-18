import {
  canAccessSettingsHref,
  hasStaffPermission,
  type StaffPermissionKey,
} from "@/features/team/permissions/staff-permissions";

/**
 * App routes that require a staff permission for MEMBER users.
 * Longer prefixes win. Unlisted business routes stay open (e.g. access-blocked).
 */
export const BUSINESS_ROUTE_STAFF_PERMISSION: Record<
  string,
  StaffPermissionKey | "always"
> = {
  "/business/dashboard": "appointments.access",
  "/business/appointments": "appointments.access",
  "/business/work-items": "work_items.access",
  "/business/pipelines": "pipelines.access",
  "/business/conversations": "conversations.access",
  "/business/contacts": "contacts.view_last_names",
  "/business/sales": "sales.access",
  "/business/gift-cards": "gift_cards.access",
  "/business/packages": "packages.access",
  "/business/memberships": "memberships.access",
  "/business/products": "products.access",
  "/business/offers": "offers.access",
  "/business/payments": "payments.access",
  "/business/time-clock": "time_clock.access",
  "/business/time-cards": "time_cards.manage",
  "/business/reports": "reports.access",
  "/business/settings": "always",
};

const OPEN_PREFIXES = [
  "/business/access-blocked",
  "/business/feature-unavailable",
];

function normalizePath(pathname: string): string {
  const raw = pathname.split("?")[0] ?? pathname;
  if (raw.length > 1 && raw.endsWith("/")) return raw.slice(0, -1);
  return raw;
}

export function resolveBusinessRouteStaffPermission(
  pathname: string,
): StaffPermissionKey | "always" | null {
  const path = normalizePath(pathname);
  if (!path.startsWith("/business")) return null;
  if (OPEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return "always";
  }
  if (path === "/business/settings" || path.startsWith("/business/settings/")) {
    return "always";
  }

  const entries = Object.entries(BUSINESS_ROUTE_STAFF_PERMISSION).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [prefix, rule] of entries) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return rule;
    }
  }
  return null;
}

export function canAccessBusinessStaffRoute(
  pathname: string,
  options: {
    businessRole?: string;
    staffPermissions?: Record<string, boolean>;
    isPlatformAdmin?: boolean;
  },
): boolean {
  if (options.isPlatformAdmin) return true;
  if (
    options.businessRole === "OWNER" ||
    options.businessRole === "ADMIN"
  ) {
    return true;
  }

  const path = normalizePath(pathname);
  if (path === "/business/settings" || path.startsWith("/business/settings/")) {
    return canAccessSettingsHref(path, options);
  }

  const rule = resolveBusinessRouteStaffPermission(path);
  if (rule == null) return true;
  if (rule === "always") return true;
  return hasStaffPermission(
    options.staffPermissions,
    rule,
    options.businessRole,
  );
}

export function resolveStaffDeniedFallbackHref(options: {
  businessRole?: string;
  staffPermissions?: Record<string, boolean>;
}): string {
  const candidates = [
    "/business/appointments",
    "/business/time-clock",
    "/business/dashboard",
    "/business/settings/appearance",
  ];
  for (const href of candidates) {
    if (
      canAccessBusinessStaffRoute(href, {
        businessRole: options.businessRole,
        staffPermissions: options.staffPermissions,
      })
    ) {
      return href;
    }
  }
  return "/business/settings/appearance";
}
