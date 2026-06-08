import {
  Building2,
  Camera,
  CreditCard,
  Factory,
  FileText,
  LayoutDashboard,
  Package,
  Plug,
  Settings,
  Shield,
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
        title: "Industries",
        href: "/platform/industries",
        icon: Factory,
      },
      { title: "Users", href: "/platform/users", icon: Users },
    ],
  },
  {
    id: "billing",
    label: "Billing & Plans",
    items: [
      { title: "Plans", href: "/platform/plans", icon: Package },
      { title: "Billing", href: "/platform/billing", icon: CreditCard },
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
