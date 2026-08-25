import { isBusinessSettingsPath } from "@/lib/config/navigation/business-settings-menu";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";

export function flattenNavSections(sections: ShellNavSection[]): ShellNavItem[] {
  return sections.flatMap((section) => section.items);
}

const automationSettingsPrefixes = [
  "/business/settings/automations",
  "/business/settings/automation-workflows",
  "/business/settings/automation-registry",
];

export function isNavItemActive(pathname: string, item: ShellNavItem): boolean {
  if (item.matchPrefix && item.href.startsWith("/business/settings")) {
    return isBusinessSettingsPath(pathname);
  }
  if (item.href === "/business/settings/automations") {
    return automationSettingsPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }
  if (item.href.startsWith("/business/settings")) {
    if (pathname === "/business/settings") {
      return item.href === "/business/settings/profile";
    }
    return (
      pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
  }
  if (item.href === "/platform/settings") {
    return pathname === "/platform/settings";
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
