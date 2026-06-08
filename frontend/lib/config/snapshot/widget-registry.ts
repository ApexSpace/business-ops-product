import {
  Calendar,
  ClipboardList,
  Contact,
  GitBranch,
  MessageSquare,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type DashboardWidgetKey =
  | "leads"
  | "contacts"
  | "appointments"
  | "conversations"
  | "workItems"
  | "workItemsCompleted"
  | "pipelines"
  | "wonDeals"
  | "teamMembers";

export interface DashboardWidgetDefinition {
  key: DashboardWidgetKey;
  labelKey: string;
  icon: LucideIcon;
  href: string;
  comingSoon?: boolean;
}

export const DASHBOARD_WIDGET_REGISTRY: Record<
  DashboardWidgetKey,
  DashboardWidgetDefinition
> = {
  leads: {
    key: "leads",
    labelKey: "entities.lead.plural",
    icon: Workflow,
    href: "/business/pipelines",
  },
  contacts: {
    key: "contacts",
    labelKey: "entities.contact.plural",
    icon: Contact,
    href: "/business/contacts",
  },
  appointments: {
    key: "appointments",
    labelKey: "entities.appointment.plural",
    icon: Calendar,
    href: "/business/appointments",
  },
  conversations: {
    key: "conversations",
    labelKey: "entities.conversation.plural",
    icon: MessageSquare,
    href: "/business/conversations",
    comingSoon: true,
  },
  workItems: {
    key: "workItems",
    labelKey: "entities.workItem.plural",
    icon: ClipboardList,
    href: "/business/work-items",
  },
  workItemsCompleted: {
    key: "workItemsCompleted",
    labelKey: "entities.workItem.completed",
    icon: ClipboardList,
    href: "/business/work-items",
  },
  pipelines: {
    key: "pipelines",
    labelKey: "entities.pipeline.plural",
    icon: GitBranch,
    href: "/business/pipelines",
  },
  wonDeals: {
    key: "wonDeals",
    labelKey: "entities.deal.won",
    icon: Workflow,
    href: "/business/pipelines",
  },
  teamMembers: {
    key: "teamMembers",
    labelKey: "entities.team.plural",
    icon: Users,
    href: "/business/settings/team",
  },
};

export const DEFAULT_DASHBOARD_WIDGET_KEYS: DashboardWidgetKey[] = [
  "leads",
  "contacts",
  "appointments",
  "conversations",
  "workItems",
  "workItemsCompleted",
  "pipelines",
  "wonDeals",
  "teamMembers",
];

export function isKnownDashboardWidgetKey(
  key: string,
): key is DashboardWidgetKey {
  return key in DASHBOARD_WIDGET_REGISTRY;
}

export function getEditableDashboardWidgetKeys(): DashboardWidgetKey[] {
  return (Object.keys(DASHBOARD_WIDGET_REGISTRY) as DashboardWidgetKey[]).filter(
    (key) => !DASHBOARD_WIDGET_REGISTRY[key].comingSoon,
  );
}
