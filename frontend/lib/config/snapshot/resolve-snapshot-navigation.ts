import type { BusinessMemberRole } from "@/features/auth/types/auth-dto";
import type { SnapshotNavItem } from "@/features/platform/types/snapshot";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import { resolveSnapshotIcon } from "./icon-registry";
import { isKnownSnapshotRoute } from "./route-registry";

export type TerminologyResolver = (key: string, fallback: string) => string;

export interface ResolveSnapshotNavigationOptions {
  navigation: SnapshotNavItem[];
  resolveLabel: TerminologyResolver;
  businessRole?: BusinessMemberRole;
  isPlatformAdmin?: boolean;
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

export function resolveSnapshotNavigation(
  options: ResolveSnapshotNavigationOptions,
): ShellNavSection[] {
  const { navigation, resolveLabel, businessRole, isPlatformAdmin = false } =
    options;

  const items: ShellNavItem[] = navigation
    .filter((item) => item.visible !== false)
    .filter((item) => isKnownSnapshotRoute(item.route))
    .filter((item) =>
      canAccessNavItem(item.requiredRoles, businessRole, isPlatformAdmin),
    )
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      title: resolveLabel(item.labelKey, item.key),
      href: item.route,
      icon: resolveSnapshotIcon(item.icon),
    }));

  return [{ id: "main", label: "", items }];
}
