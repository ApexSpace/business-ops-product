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
  Shield,
  TableProperties,
  Users,
  Workflow,
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
      {
        title: "Operations",
        href: "/platform/operations",
        icon: Workflow,
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
        title: "Tiers",
        href: "/platform/tiers",
        icon: TableProperties,
      },
      {
        title: "Add-ons",
        href: "/platform/addons",
        icon: PackagePlus,
      },
      {
        title: "Capabilities",
        href: "/platform/capabilities",
        icon: Layers,
      },
      { title: "Users", href: "/platform/users", icon: Users },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        title: "Forms",
        href: "/platform/forms",
        icon: ClipboardList,
      },
      {
        title: "Automations",
        href: "/platform/automations",
        icon: Workflow,
      },
      {
        title: "Pipelines",
        href: "/platform/pipelines",
        icon: Layers,
      },
      {
        title: "Chatbots",
        href: "/platform/chatbots",
        icon: Bot,
      },
      {
        title: "Work Items",
        href: "/platform/work-items",
        icon: ListTodo,
      },
      {
        title: "Inbox",
        href: "/platform/conversations",
        icon: MessageSquare,
      },
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
