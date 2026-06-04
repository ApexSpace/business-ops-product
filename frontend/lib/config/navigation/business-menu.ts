import {
  Calendar,
  ClipboardList,
  Contact,
  CreditCard,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Settings,
} from "lucide-react";
import type { IndustryLabels } from "@/lib/types/shared";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";

export interface BusinessMenuItem extends ShellNavItem {
  labelKey?: keyof IndustryLabels;
}

export const businessOperationalMenuItems: BusinessMenuItem[] = [
  {
    title: "Dashboard",
    href: "/business/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Contacts",
    href: "/business/contacts",
    icon: Contact,
    labelKey: "contacts",
  },
  {
    title: "Conversations",
    href: "/business/conversations",
    icon: MessageSquare,
    labelKey: "conversations",
  },
  {
    title: "CRM Pipeline",
    href: "/business/pipelines",
    icon: GitBranch,
    labelKey: "pipelines",
  },
  {
    title: "Work Items",
    href: "/business/work-items",
    icon: ClipboardList,
    labelKey: "workItems",
  },
  {
    title: "Appointments",
    href: "/business/appointments",
    icon: Calendar,
    labelKey: "appointments",
  },
  {
    title: "Payments",
    href: "/business/payments",
    icon: CreditCard,
  },
];

export const businessOperationalSections: Array<{
  id: string;
  label: string;
  items: BusinessMenuItem[];
}> = [
  { id: "main", label: "", items: businessOperationalMenuItems },
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
