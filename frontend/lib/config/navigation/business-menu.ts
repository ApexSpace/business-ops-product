import type { IndustryLabels } from "@/lib/types/shared";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import {
  BUSINESS_NAV_CATALOG,
  type BusinessNavCatalogEntry,
} from "./business-nav-catalog";
import { isNavbarCorePriority } from "./navbar-overflow";

export interface BusinessMenuItem extends ShellNavItem {
  labelKey?: keyof IndustryLabels;
  navKey: string;
  navTier: "primary" | "apps";
}

function toMenuItem(entry: BusinessNavCatalogEntry): BusinessMenuItem {
  return {
    title: entry.title,
    href: entry.href,
    icon: entry.icon,
    navKey: entry.navKey,
    navTier: isNavbarCorePriority(entry.navbarPriority) ? "primary" : "apps",
    ...(entry.labelKey ? { labelKey: entry.labelKey } : {}),
    ...(entry.matchPrefix ? { matchPrefix: true } : {}),
  };
}

export const businessOperationalMenuItems: BusinessMenuItem[] =
  BUSINESS_NAV_CATALOG.filter((entry) => entry.origin === "operational").map(
    toMenuItem,
  );

export const businessOperationalSections: Array<{
  id: string;
  label: string;
  hideLabel?: boolean;
  items: BusinessMenuItem[];
}> = [
  {
    id: "primary",
    label: "",
    hideLabel: true,
    items: businessOperationalMenuItems.filter(
      (item) => item.navTier === "primary",
    ),
  },
];

export const businessAppsMenuItems: BusinessMenuItem[] =
  businessOperationalMenuItems.filter((item) => item.navTier === "apps");

export const businessSettingsEntry = {
  title: "Settings",
  href: "/business/settings",
  icon: BUSINESS_NAV_CATALOG.find((entry) => entry.navKey === "settings")!
    .icon,
  matchPrefix: true,
} as const satisfies ShellNavItem;

function resolveItems(
  items: BusinessMenuItem[],
  labels: IndustryLabels,
): ShellNavItem[] {
  return items.map((item) => ({
    ...item,
    title: item.labelKey ? labels[item.labelKey] : item.title,
  }));
}

export function resolveBusinessOperationalSections(
  labels: IndustryLabels,
): ShellNavSection[] {
  return businessOperationalSections.map((section) => ({
    id: section.id,
    label: section.label,
    hideLabel: section.hideLabel,
    items: resolveItems(section.items, labels),
  }));
}

export function resolveBusinessAppsMenu(labels: IndustryLabels): ShellNavItem[] {
  return resolveItems(businessAppsMenuItems, labels);
}

/** @deprecated Use resolveBusinessOperationalSections */
export function resolveBusinessOperationalMenu(labels: IndustryLabels) {
  return resolveItems(businessOperationalMenuItems, labels);
}

/** @deprecated Use resolveBusinessOperationalSections */
export function resolveBusinessMenu(labels: IndustryLabels) {
  return resolveBusinessOperationalMenu(labels);
}
