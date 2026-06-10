import {
  Building2,
  Camera,
  Factory,
  FileText,
  Layers,
  LayoutDashboard,
  Plug,
  Settings,
  Shield,
  TableProperties,
  Users,
} from "lucide-react";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";

export interface PlatformMenuItem extends ShellNavItem {}

export const platformBrand = {
  title: "CodeSol Platform",
  subtitle: "Platform Admin",
  icon: Shield,
};

export const platformOperationalSections: ShellNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/platform/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "directory",
    label: "Directory",
    items: [
      {
        title: "Businesses",
        href: "/platform/businesses",
        icon: Building2,
      },
      {
        title: "Snapshots",
        href: "/platform/snapshots",
        icon: Camera,
      },
      {
        title: "Capabilities",
        href: "/platform/capabilities",
        icon: Layers,
      },
      {
        title: "Plan Groups",
        href: "/platform/plan-groups",
        icon: TableProperties,
      },
      {
        title: "Industries",
        href: "/platform/industries",
        icon: Factory,
      },
      { title: "Users", href: "/platform/users", icon: Users },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        title: "Integrations",
        href: "/platform/settings/integrations",
        icon: Plug,
      },
      {
        title: "Audit Logs",
        href: "/platform/audit-logs",
        icon: FileText,
      },
    ],
  },
];

export const platformSettingsEntry = {
  title: "Settings",
  href: "/platform/settings",
  icon: Settings,
} as const satisfies ShellNavItem;

/** @deprecated Use platformOperationalSections */
export const platformMenu: PlatformMenuItem[] =
  platformOperationalSections.flatMap((s) => s.items);
