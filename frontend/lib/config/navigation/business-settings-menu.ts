import {
  Bell,
  Calendar,
  Clock,
  CreditCard,
  Database,
  FileText,
  Globe,
  Hourglass,
  IdCard,
  LayoutGrid,
  MapPin,
  MessageCircle,
  MessageSquare,
  Palette,
  Receipt,
  RotateCcw,
  User,
  Zap,
} from "lucide-react";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import { canAccessSettingsHref } from "@/features/team/permissions/staff-permissions";
import type { BusinessMemberRole } from "@/features/auth/types/auth-dto";

export interface BusinessSettingsNavItem extends ShellNavItem {}

const businessSetupItems: BusinessSettingsNavItem[] = [
  {
    title: "Business Details",
    href: "/business/settings/profile",
    icon: IdCard,
  },
  {
    title: "Primary contact",
    href: "/business/settings/profile?tab=contact",
    icon: User,
  },
  {
    title: "Locations",
    href: "/business/settings/profile?tab=address",
    icon: MapPin,
  },
  {
    title: "Regional & tax",
    href: "/business/settings/profile?tab=regional",
    icon: Globe,
  },
  {
    title: "Business Hours",
    href: "/business/settings/business-hours",
    icon: Clock,
  },
  {
    title: "Web Chat",
    href: "/business/settings/web-chat",
    icon: MessageSquare,
  },
  {
    title: "Appearance",
    href: "/business/settings/appearance",
    icon: Palette,
  },
  {
    title: "Data import & export",
    href: "/business/settings/data",
    icon: Database,
  },
];

const calendarItems: BusinessSettingsNavItem[] = [
  {
    title: "Calendars",
    href: "/business/settings/calendars",
    icon: Calendar,
  },
  {
    title: "Display Preferences",
    href: "/business/settings/display-preferences",
    icon: LayoutGrid,
  },
  {
    title: "Cancel & Reschedule",
    href: "/business/settings/cancel-reschedule",
    icon: RotateCcw,
  },
  {
    title: "Waiting Room",
    href: "/business/settings/waiting-room",
    icon: Hourglass,
  },
  {
    title: "Scheduling Options",
    href: "/business/settings/scheduling-options",
    icon: Clock,
  },
  {
    title: "Express Booking™",
    href: "/business/settings/express-booking",
    icon: Zap,
  },
];

const paymentsItems: BusinessSettingsNavItem[] = [
  {
    title: "Financial Settings",
    href: "/business/settings/financial",
    icon: Receipt,
  },
  {
    title: "Plan & Billing",
    href: "/business/settings/billing",
    icon: CreditCard,
  },
];

const onlineBookingItems: BusinessSettingsNavItem[] = [
  {
    title: "Online Booking",
    href: "/business/settings/online-booking",
    icon: Globe,
  },
];

const automatedMessagesItems: BusinessSettingsNavItem[] = [
  {
    title: "Notifications",
    href: "/business/settings/notifications",
    icon: Bell,
  },
  {
    title: "WhatsApp",
    href: "/business/settings/whatsapp",
    icon: MessageCircle,
  },
  {
    title: "Chatbots",
    href: "/business/settings/chatbots",
    icon: MessageSquare,
  },
  {
    title: "Templates",
    href: "/business/settings/templates",
    icon: FileText,
  },
];

export const businessSettingsSections: ShellNavSection[] = [
  { id: "business-setup", label: "Business Setup", items: businessSetupItems },
  {
    id: "calendar-appointments",
    label: "Calendar & Appointments",
    items: calendarItems,
  },
  {
    id: "payments-checkout",
    label: "Payments & Checkout",
    items: paymentsItems,
  },
  {
    id: "online-booking",
    label: "Online Booking",
    items: onlineBookingItems,
  },
  {
    id: "automated-messages",
    label: "Automated Messages",
    items: automatedMessagesItems,
  },
];

/** Flat list for backwards compatibility */
export const businessSettingsNavItems: BusinessSettingsNavItem[] =
  businessSettingsSections.flatMap((s) => s.items);

export const BUSINESS_SETTINGS_BASE = "/business/settings";

/**
 * Apps that still live under `/business/settings/**` but are no longer
 * Settings chrome. Keep this list in sync with the Apps catalog.
 */
export const MIGRATED_SETTINGS_APP_PREFIXES = [
  "/business/settings/services",
  "/business/settings/team",
  "/business/settings/resources",
  "/business/settings/pipelines",
  "/business/settings/automations",
  "/business/settings/automation-workflows",
  "/business/settings/automation-registry",
  "/business/settings/forms",
  "/business/settings/integrations",
] as const;

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isMigratedSettingsAppPath(pathname: string): boolean {
  return MIGRATED_SETTINGS_APP_PREFIXES.some((prefix) =>
    matchesPathPrefix(pathname, prefix),
  );
}

export function isBusinessSettingsPath(pathname: string): boolean {
  if (isMigratedSettingsAppPath(pathname)) return false;
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
