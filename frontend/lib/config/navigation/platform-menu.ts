import { Shield } from "lucide-react";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import {
  PLATFORM_NAV_CATALOG,
  platformCatalogToShellNavItem,
  resolvePlatformAppsItems,
} from "./platform-nav-catalog";
import { NAVBAR_CORE_PRIORITY_MAX } from "./navbar-overflow";

export {
  PLATFORM_NAV_CATALOG,
  PLATFORM_APPS_MANAGE_HREF,
  PLATFORM_HOME_HREF,
  resolvePlatformAppsItems,
} from "./platform-nav-catalog";

export const platformBrand = {
  title: "PandaCue Platform",
  subtitle: "Platform Admin",
  icon: Shield,
};

const platformItems = resolvePlatformAppsItems();

export const platformOperationalSections: ShellNavSection[] = [
  {
    id: "primary",
    label: "",
    hideLabel: true,
    items: platformItems.filter(
      (item) =>
        item.navbarPriority != null &&
        item.navbarPriority <= NAVBAR_CORE_PRIORITY_MAX,
    ),
  },
];

export const platformSettingsEntry = platformCatalogToShellNavItem(
  PLATFORM_NAV_CATALOG.find((entry) => entry.navKey === "settings")!,
);

/** @deprecated Use platformOperationalSections */
export const platformMenu: ShellNavItem[] = platformItems;
