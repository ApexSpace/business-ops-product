import {
  Boxes,
  Calendar,
  ClipboardList,
  Clock,
  Contact,
  CreditCard,
  FileBarChart,
  Gift,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Package,
  Repeat,
  Settings,
  Share2,
  ShoppingBag,
  Tag,
} from "lucide-react";
import type { IndustryLabels } from "@/lib/types/shared";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";

export interface BusinessMenuItem extends ShellNavItem {
  labelKey?: keyof IndustryLabels;
  navKey: string;
  navTier: "primary" | "apps";
}

export const businessOperationalMenuItems: BusinessMenuItem[] = [
  {
    title: "Dashboard",
    href: "/business/dashboard",
    icon: LayoutDashboard,
    navKey: "dashboard",
    navTier: "primary",
  },
  {
    title: "Appointments",
    href: "/business/appointments",
    icon: Calendar,
    labelKey: "appointments",
    navKey: "appointments",
    navTier: "primary",
  },
  {
    title: "Conversations",
    href: "/business/conversations",
    icon: MessageSquare,
    labelKey: "conversations",
    navKey: "conversations",
    navTier: "primary",
  },
  {
    title: "Contacts",
    href: "/business/contacts",
    icon: Contact,
    labelKey: "contacts",
    navKey: "contacts",
    navTier: "primary",
  },
  {
    title: "Sales",
    href: "/business/sales",
    icon: ShoppingBag,
    navKey: "sales",
    navTier: "primary",
  },
  {
    title: "Work Items",
    href: "/business/work-items",
    icon: ClipboardList,
    labelKey: "workItems",
    navKey: "work-items",
    navTier: "apps",
  },
  {
    title: "Social Planner",
    href: "/business/social-planner",
    icon: Share2,
    navKey: "social-planner",
    navTier: "apps",
  },
  {
    title: "CRM Pipeline",
    href: "/business/pipelines",
    icon: GitBranch,
    labelKey: "pipelines",
    navKey: "pipelines",
    navTier: "apps",
  },
  {
    title: "Gift Cards",
    href: "/business/gift-cards",
    icon: Gift,
    navKey: "gift-cards",
    navTier: "apps",
  },
  {
    title: "Packages",
    href: "/business/packages",
    icon: Boxes,
    navKey: "packages",
    navTier: "apps",
  },
  {
    title: "Memberships",
    href: "/business/memberships",
    icon: Repeat,
    navKey: "memberships",
    navTier: "apps",
  },
  {
    title: "Products",
    href: "/business/products",
    icon: Package,
    navKey: "products",
    navTier: "apps",
  },
  {
    title: "Offers",
    href: "/business/offers",
    icon: Tag,
    navKey: "offers",
    navTier: "apps",
  },
  {
    title: "Payments",
    href: "/business/payments",
    icon: CreditCard,
    navKey: "payments",
    navTier: "apps",
  },
  {
    title: "Time Clock",
    href: "/business/time-clock",
    icon: Clock,
    navKey: "time-clock",
    navTier: "apps",
  },
  {
    title: "Time Cards",
    href: "/business/time-cards",
    icon: Clock,
    navKey: "time-cards",
    navTier: "apps",
  },
  {
    title: "Reports",
    href: "/business/reports",
    icon: FileBarChart,
    navKey: "reports",
    navTier: "apps",
  },
];

export const businessOperationalSections: Array<{
  id: string;
  label: string;
  hideLabel?: boolean;
  items: BusinessMenuItem[];
}> = [
  {
    id: "primary",
    label: "",
    hideLabel: true,
    items: businessOperationalMenuItems.filter(
      (item) => item.navTier === "primary",
    ),
  },
];

export const businessAppsMenuItems: BusinessMenuItem[] =
  businessOperationalMenuItems.filter((item) => item.navTier === "apps");

export const businessSettingsEntry = {
  title: "Settings",
  href: "/business/settings",
  icon: Settings,
  matchPrefix: true,
} as const satisfies ShellNavItem;

function resolveItems(
  items: BusinessMenuItem[],
  labels: IndustryLabels,
): ShellNavItem[] {
  return items.map((item) => ({
    ...item,
    title: item.labelKey ? labels[item.labelKey] : item.title,
  }));
}

export function resolveBusinessOperationalSections(
  labels: IndustryLabels,
): ShellNavSection[] {
  return businessOperationalSections.map((section) => ({
    id: section.id,
    label: section.label,
    hideLabel: section.hideLabel,
    items: resolveItems(section.items, labels),
  }));
}

export function resolveBusinessAppsMenu(labels: IndustryLabels): ShellNavItem[] {
  return resolveItems(businessAppsMenuItems, labels);
}

/** @deprecated Use resolveBusinessOperationalSections */
export function resolveBusinessOperationalMenu(labels: IndustryLabels) {
  return resolveItems(businessOperationalMenuItems, labels);
}

/** @deprecated Use resolveBusinessOperationalSections */
export function resolveBusinessMenu(labels: IndustryLabels) {
  return resolveBusinessOperationalMenu(labels);
}
