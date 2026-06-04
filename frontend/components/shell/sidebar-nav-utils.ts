import { isBusinessSettingsPath } from "@/lib/config/navigation/business-settings-menu";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";

export function flattenNavSections(sections: ShellNavSection[]): ShellNavItem[] {
  return sections.flatMap((section) => section.items);
}

export function isNavItemActive(pathname: string, item: ShellNavItem): boolean {
  if (item.matchPrefix && item.href.startsWith("/business/settings")) {
    return isBusinessSettingsPath(pathname);
  }
  if (item.href.startsWith("/business/settings")) {
    if (pathname === "/business/settings") {
      return item.href === "/business/settings/profile";
    }
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
