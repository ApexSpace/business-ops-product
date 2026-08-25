import {
  Bell,
  Building2,
  Calendar,
  CreditCard,
  Database,
  FileText,
  Globe,
  MessageCircle,
  MessageSquare,
  Palette,
  Receipt,
} from "lucide-react";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import { canAccessSettingsHref } from "@/features/team/permissions/staff-permissions";
import type { BusinessMemberRole } from "@/features/auth/types/auth-dto";

export interface BusinessSettingsNavItem extends ShellNavItem {}

const businessSetupItems: BusinessSettingsNavItem[] = [
  {
    title: "Business Profile",
    href: "/business/settings/profile",
    icon: Building2,
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
