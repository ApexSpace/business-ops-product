import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import {
  BUSINESS_PRIMARY_NAV_KEYS,
  isAppsNavKey,
  isPrimaryNavKey,
} from "@/lib/config/navigation/business-nav-sections";

export interface PartitionedShellNav {
  primaryItems: ShellNavItem[];
  appsItems: ShellNavItem[];
  overflowItems: ShellNavItem[];
}

const PRIMARY_ORDER = new Map(
  BUSINESS_PRIMARY_NAV_KEYS.map((key, index) => [key, index]),
);

function sortPrimaryItems(items: ShellNavItem[]): ShellNavItem[] {
  return [...items].sort((a, b) => {
    const aOrder = a.navKey ? (PRIMARY_ORDER.get(a.navKey) ?? 999) : 999;
    const bOrder = b.navKey ? (PRIMARY_ORDER.get(b.navKey) ?? 999) : 999;
    return aOrder - bOrder;
  });
}

export function partitionShellNavItems(
  items: ShellNavItem[],
): PartitionedShellNav {
  const primaryItems: ShellNavItem[] = [];
  const appsItems: ShellNavItem[] = [];
  const overflowItems: ShellNavItem[] = [];

  for (const item of items) {
    const key = item.navKey;
    if (key && isPrimaryNavKey(key)) {
      primaryItems.push({ ...item, navTier: "primary" });
    } else if (key && isAppsNavKey(key)) {
      appsItems.push({ ...item, navTier: "apps" });
    } else {
      overflowItems.push(item);
    }
  }

  return {
    primaryItems: sortPrimaryItems(primaryItems),
    appsItems,
    overflowItems,
  };
}

/** Flat primary nav section (no category label) for the main sidebar. */
export function groupShellNavItemsIntoSections(
  items: ShellNavItem[],
): ShellNavSection[] {
  const { primaryItems, overflowItems } = partitionShellNavItems(items);

  const sections: ShellNavSection[] = [];

  if (primaryItems.length > 0) {
    sections.push({
      id: "primary",
      label: "",
      hideLabel: true,
      items: primaryItems,
    });
  }

  if (overflowItems.length > 0) {
    sections.push({ id: "more", label: "More", items: overflowItems });
  }

  return sections;
}

export function resolveAppsNavItems(items: ShellNavItem[]): ShellNavItem[] {
  return partitionShellNavItems(items).appsItems;
}
