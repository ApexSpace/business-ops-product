import type { SnapshotContext } from "@/features/platform/types/snapshot";
import { DEFAULT_TERMINOLOGY } from "./default-terminology";

export const DEFAULT_SNAPSHOT_NAVIGATION = [
  {
    key: "dashboard",
    route: "/business/dashboard",
    icon: "layout-dashboard",
    labelKey: "nav.dashboard",
    order: 0,
  },
  {
    key: "contacts",
    route: "/business/contacts",
    icon: "contact",
    labelKey: "nav.contacts",
    order: 10,
  },
  {
    key: "conversations",
    route: "/business/conversations",
    icon: "message-square",
    labelKey: "nav.conversations",
    order: 20,
  },
  {
    key: "pipelines",
    route: "/business/pipelines",
    icon: "git-branch",
    labelKey: "nav.pipelines",
    order: 30,
  },
  {
    key: "work-items",
    route: "/business/work-items",
    icon: "clipboard-list",
    labelKey: "nav.workItems",
    order: 40,
  },
  {
    key: "appointments",
    route: "/business/appointments",
    icon: "calendar",
    labelKey: "nav.appointments",
    order: 50,
  },
  {
    key: "payments",
    route: "/business/payments",
    icon: "credit-card",
    labelKey: "nav.payments",
    order: 60,
  },
] as const;

export const DEFAULT_SNAPSHOT_QUICK_LINKS = [
  { href: "/business/contacts", labelKey: "nav.contacts", order: 0 },
  { href: "/business/work-items", labelKey: "nav.workItems", order: 10 },
  { href: "/business/pipelines", labelKey: "nav.pipelines", order: 20 },
  { href: "/business/appointments", labelKey: "nav.appointments", order: 30 },
  { href: "/business/conversations", labelKey: "nav.conversations", order: 40 },
  { href: "/business/settings/team", label: "Team", order: 50 },
];

export const DEFAULT_SNAPSHOT_CONTEXT: SnapshotContext = {
  snapshotId: null,
  snapshotName: "Default Business",
  contextVersion: "default",
  terminology: DEFAULT_TERMINOLOGY,
  navigation: [...DEFAULT_SNAPSHOT_NAVIGATION],
  dashboard: {
    widgets: [],
    quickLinks: [...DEFAULT_SNAPSHOT_QUICK_LINKS],
  },
  branding: {},
};
