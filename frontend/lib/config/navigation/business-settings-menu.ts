import {
  Bell,
  Briefcase,
  Calendar,
  ClipboardList,
  CreditCard,
  GitBranch,
  Globe,
  MessageCircle,
  MessageSquare,
  Palette,
  Plug,
  Receipt,
  Settings,
  Users,
  Warehouse,
  Zap,
  FileText,
  Database,
} from "lucide-react";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import { canAccessSettingsHref } from "@/features/team/permissions/staff-permissions";
import type { BusinessMemberRole } from "@/features/auth/types/auth-dto";

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
  {
    title: "Data import & export",
    href: "/business/settings/data",
    icon: Database,
  },
];

const operationsItems: BusinessSettingsNavItem[] = [
  {
    title: "Online Booking",
    href: "/business/settings/online-booking",
    icon: Globe,
  },
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
    title: "Resources",
    href: "/business/settings/resources",
    icon: Warehouse,
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
  {
    title: "WhatsApp",
    href: "/business/settings/whatsapp",
    icon: MessageCircle,
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

export function filterBusinessSettingsSections(options: {
  sections?: ShellNavSection[];
  businessRole?: BusinessMemberRole;
  staffPermissions?: Record<string, boolean>;
  isPlatformAdmin?: boolean;
}): ShellNavSection[] {
  const sections = options.sections ?? businessSettingsSections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canAccessSettingsHref(item.href, {
          businessRole: options.businessRole,
          staffPermissions: options.staffPermissions,
          isPlatformAdmin: options.isPlatformAdmin,
        }),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

