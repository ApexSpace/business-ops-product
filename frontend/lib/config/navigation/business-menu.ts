import {
  Boxes,
  Calendar,
  ClipboardList,
  Clock,
  Contact,
  CreditCard,
  Gift,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Package,
  Repeat,
  Settings,
  ShoppingBag,
  Tag,
} from "lucide-react";
import type { IndustryLabels } from "@/lib/types/shared";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";

export interface BusinessMenuItem extends ShellNavItem {
  labelKey?: keyof IndustryLabels;
  navKey: string;
}

export const businessOperationalMenuItems: BusinessMenuItem[] = [
  {
    title: "Dashboard",
    href: "/business/dashboard",
    icon: LayoutDashboard,
    navKey: "dashboard",
  },
  {
    title: "Contacts",
    href: "/business/contacts",
    icon: Contact,
    labelKey: "contacts",
    navKey: "contacts",
  },
  {
    title: "Conversations",
    href: "/business/conversations",
    icon: MessageSquare,
    labelKey: "conversations",
    navKey: "conversations",
  },
  {
    title: "CRM Pipeline",
    href: "/business/pipelines",
    icon: GitBranch,
    labelKey: "pipelines",
    navKey: "pipelines",
  },
  {
    title: "Work Items",
    href: "/business/work-items",
    icon: ClipboardList,
    labelKey: "workItems",
    navKey: "work-items",
  },
  {
    title: "Appointments",
    href: "/business/appointments",
    icon: Calendar,
    labelKey: "appointments",
    navKey: "appointments",
  },
  {
    title: "Time Clock",
    href: "/business/time-clock",
    icon: Clock,
    navKey: "time-clock",
  },
  {
    title: "Payments",
    href: "/business/payments",
    icon: CreditCard,
    navKey: "payments",
  },
  {
    title: "Sales",
    href: "/business/sales",
    icon: ShoppingBag,
    navKey: "sales",
  },
  {
    title: "Gift Cards",
    href: "/business/gift-cards",
    icon: Gift,
    navKey: "gift-cards",
  },
  {
    title: "Packages",
    href: "/business/packages",
    icon: Boxes,
    navKey: "packages",
  },
  {
    title: "Memberships",
    href: "/business/memberships",
    icon: Repeat,
    navKey: "memberships",
  },
  {
    title: "Offers",
    href: "/business/offers",
    icon: Tag,
    navKey: "offers",
  },
  {
    title: "Products",
    href: "/business/products",
    icon: Package,
    navKey: "products",
  },
];

export const businessOperationalSections: Array<{
  id: string;
  label: string;
  items: BusinessMenuItem[];
}> = [
  {
    id: "general",
    label: "General",
    items: businessOperationalMenuItems.filter((item) =>
      ["/business/dashboard", "/business/contacts", "/business/conversations", "/business/pipelines"].includes(
        item.href,
      ),
    ),
  },
  {
    id: "operations",
    label: "Operations",
    items: businessOperationalMenuItems.filter((item) =>
      [
        "/business/appointments",
        "/business/time-clock",
        "/business/payments",
        "/business/work-items",
        "/business/sales",
      ].includes(item.href),
    ),
  },
  {
    id: "catalog",
    label: "Catalog",
    items: businessOperationalMenuItems.filter((item) =>
      [
        "/business/gift-cards",
        "/business/packages",
        "/business/memberships",
        "/business/products",
        "/business/offers",
      ].includes(item.href),
    ),
  },
];

export const businessSettingsEntry = {
  title: "Settings",
  href: "/business/settings/profile",
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
    items: resolveItems(section.items, labels),
  }));
}

/** @deprecated Use resolveBusinessOperationalSections */
export function resolveBusinessOperationalMenu(labels: IndustryLabels) {
  return resolveItems(businessOperationalMenuItems, labels);
}

/** @deprecated Use resolveBusinessOperationalSections */
export function resolveBusinessMenu(labels: IndustryLabels) {
  return resolveBusinessOperationalMenu(labels);
}
