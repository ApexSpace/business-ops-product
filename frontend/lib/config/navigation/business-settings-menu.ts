import {
  Bell,
  Briefcase,
  Calendar,
  ClipboardList,
  CreditCard,
  GitBranch,
  MessageSquare,
  Palette,
  Plug,
  Receipt,
  Settings,
  Users,
  Zap,
  FileText,
} from "lucide-react";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";

export interface BusinessSettingsNavItem extends ShellNavItem {}

const generalItems: BusinessSettingsNavItem[] = [
  {
    title: "Business Profile",
    href: "/business/settings/profile",
    icon: Settings,
  },
  {
    title: "Team Members",
    href: "/business/settings/team",
    icon: Users,
  },
];

const operationsItems: BusinessSettingsNavItem[] = [
  {
    title: "Calendars",
    href: "/business/settings/calendars",
    icon: Calendar,
  },
  {
    title: "Services",
    href: "/business/settings/services",
    icon: Briefcase,
  },
  {
    title: "Pipelines",
    href: "/business/settings/pipelines",
    icon: GitBranch,
  },
  {
    title: "Financial Settings",
    href: "/business/settings/financial",
    icon: Receipt,
  },
  {
    title: "Templates",
    href: "/business/settings/templates",
    icon: FileText,
  },
];

const websiteItems: BusinessSettingsNavItem[] = [
  {
    title: "Chatbots",
    href: "/business/settings/chatbots",
    icon: MessageSquare,
  },
  {
    title: "Forms",
    href: "/business/settings/forms",
    icon: ClipboardList,
  },
];

const automationItems: BusinessSettingsNavItem[] = [
  {
    title: "Automations",
    href: "/business/settings/automations",
    icon: Zap,
  },
];

const billingItems: BusinessSettingsNavItem[] = [
  {
    title: "Plan & Billing",
    href: "/business/settings/billing",
    icon: CreditCard,
  },
  {
    title: "Integrations",
    href: "/business/settings/integrations",
    icon: Plug,
  },
];

const preferencesItems: BusinessSettingsNavItem[] = [
  {
    title: "Notifications",
    href: "/business/settings/notifications",
    icon: Bell,
  },
  {
    title: "Appearance",
    href: "/business/settings/appearance",
    icon: Palette,
  },
];

export const businessSettingsSections: ShellNavSection[] = [
  { id: "general", label: "General", items: generalItems },
  { id: "website", label: "Website", items: websiteItems },
  { id: "operations", label: "Operations", items: operationsItems },
  { id: "automation", label: "Automation", items: automationItems },
  {
    id: "billing",
    label: "Billing & Integrations",
    items: billingItems,
  },
  { id: "preferences", label: "Preferences", items: preferencesItems },
];

/** Flat list for backwards compatibility */
export const businessSettingsNavItems: BusinessSettingsNavItem[] =
  businessSettingsSections.flatMap((s) => s.items);

export const BUSINESS_SETTINGS_BASE = "/business/settings";

export function isBusinessSettingsPath(pathname: string): boolean {
  return (
    pathname === BUSINESS_SETTINGS_BASE ||
    pathname.startsWith(`${BUSINESS_SETTINGS_BASE}/`)
  );
}
