import {
  Bot,
  Building2,
  ClipboardList,
  FileText,
  Layers,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  PackagePlus,
  Plug,
  Settings,
  TableProperties,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { AppsCategoryId, ShellNavItem } from "@/lib/types/shell-nav";
import { NAVBAR_CORE_PRIORITY_MAX } from "./navbar-overflow";

export type PlatformNavCatalogOrigin = "operational" | "settings";

export interface PlatformNavCatalogEntry {
  navKey: string;
  href: string;
  icon: LucideIcon;
  title: string;
  navbarPriority?: number;
  appsCategory: AppsCategoryId;
  frequentlyUsed?: boolean;
  origin: PlatformNavCatalogOrigin;
  matchPrefix?: boolean;
}

/**
 * Platform Admin destinations — same catalog fields as business so the shared
 * navbar + Apps sidebar can consume them without a parallel system.
 *
 * Navbar order (most important → least):
 * 1 Dashboard, Operations
 * 2 Businesses
 * 3 Users, Inbox
 * 4+ Work Items → Forms → Automations → Pipelines → Chatbots → Tiers →
 *    Add-ons → Capabilities → Integrations → Audit Logs → Settings
 */
export const PLATFORM_NAV_CATALOG: PlatformNavCatalogEntry[] = [
  {
    navKey: "dashboard",
    href: "/platform/dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    navbarPriority: 1,
    appsCategory: "core",
    frequentlyUsed: true,
    origin: "operational",
  },
  {
    navKey: "operations",
    href: "/platform/operations",
    icon: Workflow,
    title: "Operations",
    navbarPriority: 1,
    appsCategory: "core",
    frequentlyUsed: true,
    origin: "operational",
  },
  {
    navKey: "businesses",
    href: "/platform/businesses",
    icon: Building2,
    title: "Businesses",
    navbarPriority: 2,
    appsCategory: "core",
    frequentlyUsed: true,
    origin: "operational",
  },
  {
    navKey: "users",
    href: "/platform/users",
    icon: Users,
    title: "Users",
    navbarPriority: 3,
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "inbox",
    href: "/platform/conversations",
    icon: MessageSquare,
    title: "Inbox",
    navbarPriority: 3,
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "work-items",
    href: "/platform/work-items",
    icon: ListTodo,
    title: "Work Items",
    navbarPriority: 4,
    appsCategory: "core",
    origin: "operational",
  },
  {
    navKey: "forms",
    href: "/platform/forms",
    icon: ClipboardList,
    title: "Forms",
    navbarPriority: 5,
    appsCategory: "marketing",
    origin: "operational",
  },
  {
    navKey: "automations",
    href: "/platform/automations",
    icon: Workflow,
    title: "Automations",
    navbarPriority: 6,
    appsCategory: "marketing",
    origin: "operational",
  },
  {
    navKey: "pipelines",
    href: "/platform/pipelines",
    icon: Layers,
    title: "Pipelines",
    navbarPriority: 7,
    appsCategory: "marketing",
    origin: "operational",
  },
  {
    navKey: "chatbots",
    href: "/platform/chatbots",
    icon: Bot,
    title: "Chatbots",
    navbarPriority: 8,
    appsCategory: "marketing",
    origin: "operational",
  },
  {
    navKey: "tiers",
    href: "/platform/tiers",
    icon: TableProperties,
    title: "Tiers",
    navbarPriority: 9,
    appsCategory: "setup",
    origin: "operational",
  },
  {
    navKey: "addons",
    href: "/platform/addons",
    icon: PackagePlus,
    title: "Add-ons",
    navbarPriority: 10,
    appsCategory: "setup",
    origin: "operational",
  },
  {
    navKey: "capabilities",
    href: "/platform/capabilities",
    icon: Layers,
    title: "Capabilities",
    navbarPriority: 11,
    appsCategory: "setup",
    origin: "operational",
  },
  {
    navKey: "integrations",
    href: "/platform/settings/integrations",
    icon: Plug,
    title: "Integrations",
    navbarPriority: 12,
    appsCategory: "setup",
    origin: "settings",
  },
  {
    navKey: "audit-logs",
    href: "/platform/audit-logs",
    icon: FileText,
    title: "Audit Logs",
    navbarPriority: 13,
    appsCategory: "setup",
    origin: "operational",
  },
  {
    navKey: "settings",
    href: "/platform/settings",
    icon: Settings,
    title: "Settings",
    navbarPriority: 14,
    appsCategory: "setup",
    origin: "settings",
  },
];

export const PLATFORM_APPS_MANAGE_HREF = "/platform/settings";
export const PLATFORM_HOME_HREF = "/platform/dashboard";

const CATALOG_BY_NAV_KEY = new Map(
  PLATFORM_NAV_CATALOG.map((entry) => [entry.navKey, entry] as const),
);
const CATALOG_BY_HREF = new Map(
  PLATFORM_NAV_CATALOG.map((entry) => [entry.href, entry] as const),
);

export function findPlatformNavCatalogEntry(
  navKey?: string,
  href?: string,
): PlatformNavCatalogEntry | undefined {
  if (navKey && CATALOG_BY_NAV_KEY.has(navKey)) {
    return CATALOG_BY_NAV_KEY.get(navKey);
  }
  if (href && CATALOG_BY_HREF.has(href)) {
    return CATALOG_BY_HREF.get(href);
  }
  return undefined;
}

export function platformCatalogToShellNavItem(
  entry: PlatformNavCatalogEntry,
): ShellNavItem {
  return {
    title: entry.title,
    href: entry.href,
    icon: entry.icon,
    navKey: entry.navKey,
    matchPrefix: entry.matchPrefix,
    appsCategory: entry.appsCategory,
    navbarPriority: entry.navbarPriority,
    frequentlyUsed: entry.frequentlyUsed,
    navTier:
      entry.navbarPriority != null &&
      entry.navbarPriority <= NAVBAR_CORE_PRIORITY_MAX
        ? "primary"
        : "apps",
  };
}

export const PLATFORM_APPS_ITEMS: ShellNavItem[] =
  PLATFORM_NAV_CATALOG.map(platformCatalogToShellNavItem);

export function resolvePlatformAppsItems(): ShellNavItem[] {
  return PLATFORM_APPS_ITEMS;
}
