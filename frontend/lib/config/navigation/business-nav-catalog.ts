import {
  Boxes,
  Briefcase,
  Calendar,
  ClipboardList,
  Clock,
  Contact,
  CreditCard,
  FileBarChart,
  Gift,
  GitBranch,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  Package,
  Repeat,
  Settings,
  Share2,
  ShoppingBag,
  Tag,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { IndustryLabels } from "@/lib/types/shared";
import type { ShellNavItem } from "@/lib/types/shell-nav";
import { canAccessSettingsHref } from "@/features/team/permissions/staff-permissions";
import {
  canAccessBusinessRoute,
  isCoreSafeBusinessRoute,
} from "@/lib/capabilities/route-capability-map";

export type AppsCategoryId = "core" | "marketing" | "setup";
export type NavbarPriority = 1 | 2 | 3 | 4 | 5;
export type NavCatalogOrigin = "operational" | "settings";

export interface BusinessNavCatalogEntry {
  navKey: string;
  href: string;
  icon: LucideIcon;
  title: string;
  labelKey?: keyof IndustryLabels;
  /**
   * Lower number stays in the top navbar longer.
   * Omit to keep the item Apps-panel-only.
   */
  navbarPriority?: NavbarPriority;
  appsCategory: AppsCategoryId;
  frequentlyUsed?: boolean;
  origin: NavCatalogOrigin;
  matchPrefix?: boolean;
}

export const APPS_CATEGORY_ORDER: AppsCategoryId[] = [
  "core",
  "marketing",
  "setup",
];

export const APPS_CATEGORY_LABELS: Record<AppsCategoryId, string> = {
  core: "Core apps",
  marketing: "Marketing and automation",
  setup: "Setup and management",
};

export const BUSINESS_NAV_CATALOG: BusinessNavCatalogEntry[] = [
  {
    navKey: "dashboard",
    href: "/business/dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    navbarPriority: 1,
    appsCategory: "core",
    frequentlyUsed: true,
    origin: "operational",
  },
  {
    navKey: "appointments",
    href: "/business/appointments",
    icon: Calendar,
    title: "Appointments",
    labelKey: "appointments",
    navbarPriority: 1,
    appsCategory: "core",
    frequentlyUsed: true,
    origin: "operational",
  },
  {
    navKey: "contacts",
    href: "/business/contacts",
    icon: Contact,
    title: "Contacts",
    labelKey: "contacts",
    navbarPriority: 2,
    appsCategory: "core",
    frequentlyUsed: true,
    origin: "operational",
  },
  {
    navKey: "conversations",
    href: "/business/conversations",
    icon: MessageSquare,
    title: "Conversations",
    labelKey: "conversations",
    navbarPriority: 3,
    appsCategory: "core",
    frequentlyUsed: true,
    origin: "operational",
  },
  {
    navKey: "sales",
    href: "/business/sales",
    icon: ShoppingBag,
    title: "Sales",
    navbarPriority: 3,
    appsCategory: "core",
    frequentlyUsed: true,
    origin: "operational",
  },
  {
    navKey: "reports",
    href: "/business/reports",
    icon: FileBarChart,
    title: "Reports",
    navbarPriority: 4,
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "products",
    href: "/business/products",
    icon: Package,
    title: "Products",
    navbarPriority: 5,
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "work-items",
    href: "/business/work-items",
    icon: ClipboardList,
    title: "Work Items",
    labelKey: "workItems",
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "pipelines",
    href: "/business/pipelines",
    icon: GitBranch,
    title: "CRM Pipeline",
    labelKey: "pipelines",
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "gift-cards",
    href: "/business/gift-cards",
    icon: Gift,
    title: "Gift Cards",
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "packages",
    href: "/business/packages",
    icon: Boxes,
    title: "Packages",
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "memberships",
    href: "/business/memberships",
    icon: Repeat,
    title: "Memberships",
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "payments",
    href: "/business/payments",
    icon: CreditCard,
    title: "Payments",
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "time-clock",
    href: "/business/time-clock",
    icon: Clock,
    title: "Time Clock",
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "time-cards",
    href: "/business/time-cards",
    icon: Clock,
    title: "Time Cards",
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "forms",
    href: "/business/settings/forms",
    icon: ClipboardList,
    title: "Forms",
    appsCategory: "core",
    origin: "settings",
  },
  {
    navKey: "social-planner",
    href: "/business/social-planner",
    icon: Share2,
    title: "Social Planner",
    appsCategory: "marketing",
    origin: "operational",
  },
  {
    navKey: "offers",
    href: "/business/offers",
    icon: Tag,
    title: "Offers",
    appsCategory: "marketing",
    origin: "operational",
  },
  {
    navKey: "automations",
    href: "/business/settings/automations",
    icon: Zap,
    title: "Automations",
    appsCategory: "marketing",
    origin: "settings",
  },
  {
    navKey: "settings",
    href: "/business/settings",
    icon: Settings,
    title: "Settings",
    appsCategory: "setup",
    origin: "settings",
    matchPrefix: true,
  },
  {
    navKey: "team",
    href: "/business/settings/team",
    icon: Users,
    title: "Team Members",
    appsCategory: "setup",
    origin: "settings",
  },
  {
    navKey: "services",
    href: "/business/settings/services",
    icon: Briefcase,
    title: "Services",
    appsCategory: "setup",
    origin: "settings",
  },
  {
    navKey: "pipeline-settings",
    href: "/business/settings/pipelines",
    icon: GitBranch,
    title: "Pipelines",
    labelKey: "pipelines",
    appsCategory: "setup",
    origin: "settings",
  },
];

export const APPS_MANAGE_HREF = "/business/settings";

const CATALOG_BY_NAV_KEY = new Map(
  BUSINESS_NAV_CATALOG.map((entry) => [entry.navKey, entry] as const),
);
const CATALOG_BY_HREF = new Map(
  BUSINESS_NAV_CATALOG.map((entry) => [entry.href, entry] as const),
);

export function findNavCatalogEntry(
  navKey?: string,
  href?: string,
): BusinessNavCatalogEntry | undefined {
  if (navKey && CATALOG_BY_NAV_KEY.has(navKey)) {
    return CATALOG_BY_NAV_KEY.get(navKey);
  }
  if (href && CATALOG_BY_HREF.has(href)) {
    return CATALOG_BY_HREF.get(href);
  }
  return undefined;
}

export function decorateShellNavItem(item: ShellNavItem): ShellNavItem {
  const entry = findNavCatalogEntry(item.navKey, item.href);
  if (!entry) {
    return {
      ...item,
      navTier: item.navTier ?? "apps",
      appsCategory: item.appsCategory ?? "core",
    };
  }
  return {
    ...item,
    navKey: item.navKey ?? entry.navKey,
    navTier:
      item.navTier ??
      (entry.navbarPriority != null && entry.navbarPriority <= 3
        ? "primary"
        : "apps"),
    matchPrefix: item.matchPrefix ?? entry.matchPrefix,
    appsCategory: entry.appsCategory,
    navbarPriority: entry.navbarPriority,
    frequentlyUsed: entry.frequentlyUsed,
    icon: item.icon ?? entry.icon,
  };
}

export function navbarPriorityVisibilityClass(
  priority?: NavbarPriority,
): string {
  switch (priority) {
    case 1:
      return "inline-flex";
    case 2:
      return "hidden md:inline-flex";
    case 3:
      return "hidden lg:inline-flex";
    case 4:
      return "hidden xl:inline-flex";
    case 5:
      return "hidden 2xl:inline-flex";
    default:
      return "hidden";
  }
}

export function flattenShellNavSections(
  sections: Array<{ items: ShellNavItem[] }>,
): ShellNavItem[] {
  return sections.flatMap((section) => section.items);
}

export function collectOperationalNavItems(
  sections: Array<{ items: ShellNavItem[] }>,
  appsItems: ShellNavItem[],
): ShellNavItem[] {
  return dedupeNavItems(
    [...flattenShellNavSections(sections), ...appsItems].map(
      decorateShellNavItem,
    ),
  );
}

export function resolveNavbarNavItems(items: ShellNavItem[]): ShellNavItem[] {
  return dedupeNavItems(items.map(decorateShellNavItem))
    .filter((item) => item.navbarPriority != null)
    .sort((a, b) => {
      const priorityDelta = (a.navbarPriority ?? 99) - (b.navbarPriority ?? 99);
      if (priorityDelta !== 0) return priorityDelta;
      return catalogIndex(a) - catalogIndex(b);
    });
}

export interface AppsPanelSection {
  id: "frequently-used" | AppsCategoryId;
  label: string;
  layout: "featured" | "grid";
  items: ShellNavItem[];
}

export function groupAppsPanelSections(
  items: ShellNavItem[],
): AppsPanelSection[] {
  const unique = dedupeNavItems(items.map(decorateShellNavItem));
  const featured = unique.filter((item) => item.frequentlyUsed);
  const sections: AppsPanelSection[] = [];

  if (featured.length > 0) {
    sections.push({
      id: "frequently-used",
      label: "Frequently used",
      layout: "featured",
      items: featured,
    });
  }

  for (const categoryId of APPS_CATEGORY_ORDER) {
    const categoryItems = unique
      .filter((item) => (item.appsCategory ?? "core") === categoryId)
      .sort((a, b) => catalogIndex(a) - catalogIndex(b));
    if (categoryItems.length === 0) continue;
    sections.push({
      id: categoryId,
      label: APPS_CATEGORY_LABELS[categoryId],
      layout: "grid",
      items: categoryItems,
    });
  }

  return sections;
}

export function filterAppsPanelItems(
  items: ShellNavItem[],
  query: string,
): ShellNavItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => item.title.toLowerCase().includes(normalized));
}

export function catalogEntryToShellNavItem(
  entry: BusinessNavCatalogEntry,
  title = entry.title,
): ShellNavItem {
  return decorateShellNavItem({
    title,
    href: entry.href,
    icon: entry.icon,
    navKey: entry.navKey,
    matchPrefix: entry.matchPrefix,
  });
}

function canAccessCatalogSettingsEntry(
  entry: BusinessNavCatalogEntry,
  options: {
    businessRole?: string;
    staffPermissions?: Record<string, boolean>;
    isPlatformAdmin?: boolean;
  },
): boolean {
  if (entry.navKey === "settings") {
    return (
      canAccessSettingsHref("/business/settings", options) ||
      canAccessSettingsHref("/business/settings/appearance", options) ||
      canAccessSettingsHref("/business/settings/profile", options)
    );
  }
  return canAccessSettingsHref(entry.href, options);
}

export function resolveSettingsAppsItems(options: {
  resolveLabel?: (key: string, fallback: string) => string;
  businessRole?: string;
  staffPermissions?: Record<string, boolean>;
  isPlatformAdmin?: boolean;
  capabilityKeys?: Set<string>;
}): ShellNavItem[] {
  const access = {
    businessRole: options.businessRole,
    staffPermissions: options.staffPermissions,
    isPlatformAdmin: options.isPlatformAdmin,
  };

  return BUSINESS_NAV_CATALOG.filter((entry) => entry.origin === "settings")
    .filter((entry) => canAccessCatalogSettingsEntry(entry, access))
    .filter((entry) => {
      if (!options.capabilityKeys) return true;
      if (isCoreSafeBusinessRoute(entry.href)) return true;
      return canAccessBusinessRoute(entry.href, options.capabilityKeys);
    })
    .map((entry) => {
      const title =
        entry.labelKey && options.resolveLabel
          ? options.resolveLabel(entry.labelKey, entry.title)
          : entry.title;
      return catalogEntryToShellNavItem(entry, title);
    });
}

export function mergeAppsPanelItems(
  operationalItems: ShellNavItem[],
  settingsItems: ShellNavItem[],
): ShellNavItem[] {
  return dedupeNavItems(
    [...operationalItems, ...settingsItems].map(decorateShellNavItem),
  ).sort((a, b) => catalogIndex(a) - catalogIndex(b));
}

export { LayoutGrid as AppsManageIcon };

function catalogIndex(item: ShellNavItem): number {
  const entry = findNavCatalogEntry(item.navKey, item.href);
  if (!entry) return BUSINESS_NAV_CATALOG.length;
  return BUSINESS_NAV_CATALOG.indexOf(entry);
}

function dedupeNavItems(items: ShellNavItem[]): ShellNavItem[] {
  const seen = new Set<string>();
  const result: ShellNavItem[] = [];
  for (const item of items) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    result.push(item);
  }
  return result;
}
