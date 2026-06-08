import {
  DEFAULT_SNAPSHOT_NAVIGATION,
  DEFAULT_SNAPSHOT_QUICK_LINKS,
} from "@/lib/config/snapshot/default-snapshot-context";
import { DEFAULT_TERMINOLOGY } from "@/lib/config/snapshot/default-terminology";
import { DASHBOARD_WIDGET_REGISTRY } from "@/lib/config/snapshot/widget-registry";
import type { SnapshotAssets, SnapshotNavItem } from "@/features/platform/types/snapshot";
import { createDefaultSnapshotAssets } from "@/features/platform/schemas/snapshot-form";

export type TerminologyPresetId = "default" | "healthcare" | "professional";
export type NavigationPresetId = "full" | "sales_focused" | "minimal";
export type DashboardPresetId = "default" | "sales" | "operations";

export const TERMINOLOGY_PRESET_OPTIONS: {
  value: TerminologyPresetId;
  label: string;
  description: string;
}[] = [
  {
    value: "default",
    label: "Standard business",
    description: "Contacts, pipelines, appointments, and work items.",
  },
  {
    value: "healthcare",
    label: "Healthcare & wellness",
    description: "Patients, treatments, and clinical-friendly labels.",
  },
  {
    value: "professional",
    label: "Professional services",
    description: "Clients, projects, and engagement-focused wording.",
  },
];

export const NAVIGATION_PRESET_OPTIONS: {
  value: NavigationPresetId;
  label: string;
  description: string;
}[] = [
  {
    value: "full",
    label: "Full workspace",
    description: "Dashboard, CRM, work items, appointments, and payments.",
  },
  {
    value: "sales_focused",
    label: "Sales focused",
    description: "Pipeline-first navigation with core CRM pages.",
  },
  {
    value: "minimal",
    label: "Essentials only",
    description: "Dashboard, contacts, and appointments.",
  },
];

export const DASHBOARD_PRESET_OPTIONS: {
  value: DashboardPresetId;
  label: string;
  description: string;
}[] = [
  {
    value: "default",
    label: "Balanced overview",
    description: "Leads, contacts, appointments, and team activity.",
  },
  {
    value: "sales",
    label: "Sales performance",
    description: "Pipeline metrics, won deals, and lead volume.",
  },
  {
    value: "operations",
    label: "Operations",
    description: "Work items, appointments, and team workload.",
  },
];

const HEALTHCARE_TERMINOLOGY: Record<string, string> = {
  ...DEFAULT_TERMINOLOGY,
  "nav.contacts": "Patients",
  "nav.pipelines": "Care pipeline",
  "nav.workItems": "Treatment plans",
  "nav.appointments": "Visits",
  "entities.contact.plural": "Patients",
  "entities.contact.singular": "Patient",
  "entities.lead.plural": "Inquiries",
  "entities.lead.singular": "Inquiry",
  "entities.workItem.plural": "Treatment plans",
  "entities.workItem.singular": "Treatment plan",
  "entities.appointment.plural": "Visits",
  "actions.bookAppointment": "Book visit",
};

const PROFESSIONAL_TERMINOLOGY: Record<string, string> = {
  ...DEFAULT_TERMINOLOGY,
  "nav.contacts": "Clients",
  "nav.pipelines": "Engagements",
  "nav.workItems": "Projects",
  "entities.contact.plural": "Clients",
  "entities.contact.singular": "Client",
  "entities.lead.plural": "Prospects",
  "entities.lead.singular": "Prospect",
  "entities.pipeline.plural": "Engagements",
  "entities.workItem.plural": "Projects",
  "entities.workItem.singular": "Project",
  "actions.bookAppointment": "Schedule meeting",
};

function navFromKeys(keys: string[]): SnapshotNavItem[] {
  const items: SnapshotNavItem[] = [];
  keys.forEach((key, index) => {
    const item = DEFAULT_SNAPSHOT_NAVIGATION.find((n) => n.key === key);
    if (!item) return;
    items.push({
      key: item.key,
      route: item.route,
      icon: item.icon,
      labelKey: item.labelKey,
      order: index * 10,
    });
  });
  return items;
}

const SALES_NAV_KEYS = [
  "dashboard",
  "pipelines",
  "contacts",
  "conversations",
  "appointments",
] as const;

const MINIMAL_NAV_KEYS = ["dashboard", "contacts", "appointments"] as const;

function widgetsFromKeys(keys: string[]) {
  return keys.map((key, index) => ({ key, order: index * 10, visible: true }));
}

const SALES_WIDGET_KEYS = ["leads", "pipelines", "wonDeals", "contacts", "teamMembers"];
const OPERATIONS_WIDGET_KEYS = [
  "workItems",
  "workItemsCompleted",
  "appointments",
  "teamMembers",
  "contacts",
];

export function applyTerminologyPreset(
  assets: SnapshotAssets,
  preset: TerminologyPresetId,
): SnapshotAssets {
  const terminology =
    preset === "healthcare"
      ? HEALTHCARE_TERMINOLOGY
      : preset === "professional"
        ? PROFESSIONAL_TERMINOLOGY
        : { ...DEFAULT_TERMINOLOGY };
  return { ...assets, terminology };
}

export function applyNavigationPreset(
  assets: SnapshotAssets,
  preset: NavigationPresetId,
): SnapshotAssets {
  const navigation =
    preset === "sales_focused"
      ? navFromKeys([...SALES_NAV_KEYS])
      : preset === "minimal"
        ? navFromKeys([...MINIMAL_NAV_KEYS])
        : [...DEFAULT_SNAPSHOT_NAVIGATION];
  return { ...assets, navigation };
}

export function applyDashboardPreset(
  assets: SnapshotAssets,
  preset: DashboardPresetId,
): SnapshotAssets {
  const widgetKeys =
    preset === "sales"
      ? SALES_WIDGET_KEYS
      : preset === "operations"
        ? OPERATIONS_WIDGET_KEYS
        : Object.keys(DASHBOARD_WIDGET_REGISTRY);
  return {
    ...assets,
    dashboard: {
      widgets: widgetsFromKeys(widgetKeys),
      quickLinks: [...DEFAULT_SNAPSHOT_QUICK_LINKS],
    },
  };
}

export function buildAssetsFromWizardPresets(options: {
  startingAssets: SnapshotAssets;
  terminologyPreset: TerminologyPresetId;
  navigationPreset: NavigationPresetId;
  dashboardPreset: DashboardPresetId;
}): SnapshotAssets {
  let assets = { ...options.startingAssets };
  assets = applyTerminologyPreset(assets, options.terminologyPreset);
  assets = applyNavigationPreset(assets, options.navigationPreset);
  assets = applyDashboardPreset(assets, options.dashboardPreset);
  return assets;
}

export function getDefaultStartingAssets(mode: "blank" | "default"): SnapshotAssets {
  return mode === "blank"
    ? createDefaultSnapshotAssets()
    : {
        terminology: { ...DEFAULT_TERMINOLOGY },
        navigation: [...DEFAULT_SNAPSHOT_NAVIGATION],
        dashboard: {
          widgets: Object.keys(DASHBOARD_WIDGET_REGISTRY).map((key, index) => ({
            key,
            order: index * 10,
          })),
          quickLinks: [...DEFAULT_SNAPSHOT_QUICK_LINKS],
        },
        crm: createDefaultSnapshotAssets().crm,
        calendars: [],
        chatbots: [],
        emails: { preferences: [], templates: [] },
        branding: {},
        integrations: [],
      };
}
