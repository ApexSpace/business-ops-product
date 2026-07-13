import type { BusinessMemberRole } from "@/features/auth/types/auth-dto";
import type { SnapshotNavItem } from "@/features/platform/types/snapshot";
import {
  hasStaffPermission,
  NAV_KEY_PERMISSION_MAP,
  type StaffPermissionKey,
} from "@/features/team/permissions/staff-permissions";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import {
  isCoreSafeBusinessRoute,
  resolveRouteCapability,
  warnUnmappedBusinessRoute,
} from "@/lib/capabilities/route-capability-map";
import { resolveSnapshotIcon } from "./icon-registry";
import { isKnownSnapshotRoute } from "./route-registry";
import {
  groupShellNavItemsIntoSections,
  resolveAppsNavItems,
} from "@/lib/config/navigation/group-shell-nav-sections";

export type TerminologyResolver = (key: string, fallback: string) => string;

export interface ResolveSnapshotNavigationOptions {
  navigation: SnapshotNavItem[];
  resolveLabel: TerminologyResolver;
  businessRole?: BusinessMemberRole;
  isPlatformAdmin?: boolean;
  hasModule?: (moduleKey: string) => boolean;
  staffPermissions?: Record<string, boolean>;
}

export interface SnapshotNavigationResult {
  sections: ShellNavSection[];
  appsItems: ShellNavItem[];
}

function canAccessNavItem(
  requiredRoles: string[] | undefined,
  businessRole: BusinessMemberRole | undefined,
  isPlatformAdmin: boolean,
): boolean {
  if (isPlatformAdmin) return true;
  if (!requiredRoles?.length) return true;
  if (!businessRole) return false;
  return requiredRoles.includes(businessRole);
}

function canAccessByCapability(
  route: string,
  hasModule: ((moduleKey: string) => boolean) | undefined,
  isPlatformAdmin: boolean,
): boolean {
  if (isPlatformAdmin) return true;
  if (isCoreSafeBusinessRoute(route)) return true;

  const entry = resolveRouteCapability(route);
  if (!entry) {
    warnUnmappedBusinessRoute(route);
    return true;
  }

  if (!hasModule) return true;
  return hasModule(entry.moduleKey);
}

function canAccessByStaffPermission(
  navKey: string | undefined,
  businessRole: BusinessMemberRole | undefined,
  isPlatformAdmin: boolean,
  staffPermissions?: Record<string, boolean>,
): boolean {
  if (isPlatformAdmin) return true;
  if (businessRole === "OWNER" || businessRole === "ADMIN") return true;
  if (!navKey) return true;
  const permission = NAV_KEY_PERMISSION_MAP[navKey] as
    | StaffPermissionKey
    | undefined;
  if (!permission) return true;
  return hasStaffPermission(staffPermissions, permission, businessRole);
}

function resolveNavItems(
  options: ResolveSnapshotNavigationOptions,
): ShellNavItem[] {
  const {
    navigation,
    resolveLabel,
    businessRole,
    isPlatformAdmin = false,
    hasModule,
    staffPermissions,
  } = options;

  return navigation
    .filter((item) => item.visible !== false)
    .filter((item) => isKnownSnapshotRoute(item.route))
    .filter((item) =>
      canAccessNavItem(item.requiredRoles, businessRole, isPlatformAdmin),
    )
    .filter((item) =>
      canAccessByCapability(item.route, hasModule, isPlatformAdmin),
    )
    .filter((item) =>
      canAccessByStaffPermission(
        item.key,
        businessRole,
        isPlatformAdmin,
        staffPermissions,
      ),
    )
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      title: resolveLabel(item.labelKey, item.key),
      href: item.route,
      icon: resolveSnapshotIcon(item.icon),
      navKey: item.key,
    }));
}

export function resolveSnapshotNavigation(
  options: ResolveSnapshotNavigationOptions,
): SnapshotNavigationResult {
  const items = resolveNavItems(options);
  return {
    sections: groupShellNavItemsIntoSections(items),
    appsItems: resolveAppsNavItems(items),
  };
}

/** @deprecated Use resolveSnapshotNavigation which returns appsItems separately */
export function resolveSnapshotNavigationSections(
  options: ResolveSnapshotNavigationOptions,
): ShellNavSection[] {
  return resolveSnapshotNavigation(options).sections;
}
