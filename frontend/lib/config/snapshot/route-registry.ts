import { businessOperationalMenuItems } from "@/lib/config/navigation/business-menu";
import { BUSINESS_NAV_CATALOG } from "@/lib/config/navigation/business-nav-catalog";
import { businessSettingsNavItems } from "@/lib/config/navigation/business-settings-menu";

const operationalRoutes = businessOperationalMenuItems.map((item) => item.href);
const settingsRoutes = businessSettingsNavItems.map((item) => item.href);
const catalogRoutes = BUSINESS_NAV_CATALOG.map((entry) => entry.href);

export const SNAPSHOT_BUSINESS_ROUTES = new Set([
  ...operationalRoutes,
  ...settingsRoutes,
  ...catalogRoutes,
]);

export function isKnownSnapshotRoute(route: string): boolean {
  return SNAPSHOT_BUSINESS_ROUTES.has(route);
}
