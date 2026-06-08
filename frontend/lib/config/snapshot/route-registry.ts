import { businessOperationalMenuItems } from "@/lib/config/navigation/business-menu";
import { businessSettingsNavItems } from "@/lib/config/navigation/business-settings-menu";

const operationalRoutes = businessOperationalMenuItems.map((item) => item.href);
const settingsRoutes = businessSettingsNavItems.map((item) => item.href);

export const SNAPSHOT_BUSINESS_ROUTES = new Set([
  ...operationalRoutes,
  ...settingsRoutes,
]);

export function isKnownSnapshotRoute(route: string): boolean {
  return SNAPSHOT_BUSINESS_ROUTES.has(route);
}
