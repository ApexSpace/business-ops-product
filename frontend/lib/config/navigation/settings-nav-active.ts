import { parseBusinessProfileTab } from "@/features/settings/schemas/business-profile-tabs";
import { isNavItemActive } from "@/components/shell/sidebar-nav-utils";
import type { ShellNavItem } from "@/lib/types/shell-nav";

export const BUSINESS_SETTINGS_PROFILE_PATH = "/business/settings/profile";

function splitHref(href: string): { pathname: string; search: string } {
  const q = href.indexOf("?");
  if (q === -1) return { pathname: href, search: "" };
  return { pathname: href.slice(0, q), search: href.slice(q + 1) };
}

function tabFromSearch(search: string): string | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return params.get("tab");
}

function isSettingsIndexPath(pathname: string): boolean {
  return pathname === "/business/settings" || pathname === "/business/settings/";
}

/**
 * Settings sidebar active matching.
 * Profile sections share one pathname and are distinguished by `?tab=`.
 * A missing tab is Business Details (`business`).
 */
export function isSettingsNavItemActive(
  pathname: string,
  search: string,
  item: Pick<ShellNavItem, "href">,
): boolean {
  if (isSettingsIndexPath(pathname)) return false;

  const { pathname: itemPath, search: itemSearch } = splitHref(item.href);

  if (
    pathname === BUSINESS_SETTINGS_PROFILE_PATH &&
    itemPath === BUSINESS_SETTINGS_PROFILE_PATH
  ) {
    const currentTab = parseBusinessProfileTab(tabFromSearch(search));
    const itemTab = parseBusinessProfileTab(tabFromSearch(itemSearch));
    return currentTab === itemTab;
  }

  return isNavItemActive(pathname, item as ShellNavItem);
}
