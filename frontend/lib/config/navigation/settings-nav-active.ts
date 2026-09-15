import { parseBusinessProfileTab } from "@/features/settings/schemas/business-profile-tabs";
import { businessSettingsNavItems } from "@/lib/config/navigation/business-settings-menu";
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

/** Unique settings sidebar pathnames (query stripped). */
const SETTINGS_NAV_PATHNAMES = [
  ...new Set(
    businessSettingsNavItems.map((item) => splitHref(item.href).pathname),
  ),
];

/**
 * Among settings nav pathnames that match the current path, pick the longest
 * so parents (e.g. `/online-booking`) do not stay active on child routes.
 */
function bestMatchingSettingsPathname(pathname: string): string | null {
  let best: string | null = null;
  for (const candidate of SETTINGS_NAV_PATHNAMES) {
    if (pathname === candidate || pathname.startsWith(`${candidate}/`)) {
      if (!best || candidate.length > best.length) {
        best = candidate;
      }
    }
  }
  return best;
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

  const best = bestMatchingSettingsPathname(pathname);
  return best != null && itemPath === best;
}
