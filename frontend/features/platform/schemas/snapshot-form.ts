import { z } from "zod";
import type { Snapshot, SnapshotAssets } from "@/features/platform/types/snapshot";
import {
  DEFAULT_SNAPSHOT_NAVIGATION,
  DEFAULT_SNAPSHOT_QUICK_LINKS,
} from "@/lib/config/snapshot/default-snapshot-context";
import { DEFAULT_TERMINOLOGY } from "@/lib/config/snapshot/default-terminology";
import { DEFAULT_DASHBOARD_WIDGET_KEYS } from "@/lib/config/snapshot/widget-registry";

const snapshotNavItemSchema = z.object({
  key: z.string().min(1),
  route: z.string().min(1),
  icon: z.string().min(1),
  labelKey: z.string().min(1),
  order: z.number(),
  visible: z.boolean().optional(),
  requiredRoles: z.array(z.string()).optional(),
});

const snapshotWidgetSchema = z.object({
  key: z.string().min(1),
  order: z.number(),
  visible: z.boolean().optional(),
});

const snapshotQuickLinkSchema = z.object({
  href: z.string().min(1),
  labelKey: z.string().optional(),
  label: z.string().optional(),
  order: z.number().optional(),
  visible: z.boolean().optional(),
});

export const snapshotOverviewSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
});

export const snapshotTerminologySchema = z.object({
  terminologyText: z.string(),
});

export const snapshotNavigationSchema = z.object({
  navigationJson: z.string(),
});

export const snapshotDashboardSchema = z.object({
  widgetsJson: z.string(),
  quickLinksJson: z.string(),
});

export const snapshotBrandingSchema = z.object({
  productName: z.string().optional(),
  accentColor: z.string().optional(),
  logoUrl: z.string().optional(),
  publicPageTitle: z.string().optional(),
});

export const snapshotAssetsJsonSchema = z.object({
  assetsJson: z.string(),
});

export type SnapshotOverviewValues = z.infer<typeof snapshotOverviewSchema>;
export type SnapshotTerminologyValues = z.infer<typeof snapshotTerminologySchema>;
export type SnapshotNavigationValues = z.infer<typeof snapshotNavigationSchema>;
export type SnapshotDashboardValues = z.infer<typeof snapshotDashboardSchema>;
export type SnapshotBrandingValues = z.infer<typeof snapshotBrandingSchema>;
export type SnapshotAssetsJsonValues = z.infer<typeof snapshotAssetsJsonSchema>;

export function createDefaultSnapshotAssets(): SnapshotAssets {
  return {
    terminology: { ...DEFAULT_TERMINOLOGY },
    navigation: [...DEFAULT_SNAPSHOT_NAVIGATION],
    dashboard: {
      widgets: DEFAULT_DASHBOARD_WIDGET_KEYS.map((key, index) => ({
        key,
        order: index * 10,
      })),
      quickLinks: [...DEFAULT_SNAPSHOT_QUICK_LINKS],
    },
    crm: {
      pipelines: [
        {
          sourceKey: "default-pipeline",
          name: "Sales Pipeline",
          stages: [
            { name: "New Lead", type: "OPEN" },
            { name: "Contacted", type: "OPEN" },
            { name: "Qualified", type: "OPEN" },
            { name: "Won", type: "WON" },
            { name: "Lost", type: "LOST" },
          ],
        },
      ],
      tags: [],
      services: [],
    },
    calendars: [],
    chatbots: [],
    emails: { preferences: [], templates: [] },
    branding: {},
    integrations: [],
  };
}

export function snapshotToOverviewValues(snapshot: Snapshot): SnapshotOverviewValues {
  return {
    name: snapshot.name,
    description: snapshot.description ?? "",
  };
}

export function terminologyToText(terminology: Record<string, string>): string {
  return Object.entries(terminology)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function textToTerminology(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

export function snapshotToTerminologyValues(
  snapshot: Snapshot,
): SnapshotTerminologyValues {
  return {
    terminologyText: terminologyToText(snapshot.assets.terminology),
  };
}

export function snapshotToNavigationValues(
  snapshot: Snapshot,
): SnapshotNavigationValues {
  return {
    navigationJson: JSON.stringify(snapshot.assets.navigation, null, 2),
  };
}

export function snapshotToDashboardValues(
  snapshot: Snapshot,
): SnapshotDashboardValues {
  return {
    widgetsJson: JSON.stringify(snapshot.assets.dashboard.widgets, null, 2),
    quickLinksJson: JSON.stringify(snapshot.assets.dashboard.quickLinks, null, 2),
  };
}

export function snapshotToBrandingValues(
  snapshot: Snapshot,
): SnapshotBrandingValues {
  const branding = snapshot.assets.branding ?? {};
  return {
    productName: branding.productName ?? "",
    accentColor: branding.accentColor ?? "",
    logoUrl: branding.logoUrl ?? "",
    publicPageTitle: branding.publicPageTitle ?? "",
  };
}

export function snapshotToAssetsJsonValues(
  snapshot: Snapshot,
): SnapshotAssetsJsonValues {
  return {
    assetsJson: JSON.stringify(snapshot.assets, null, 2),
  };
}

export function mergeSnapshotAssets(
  current: SnapshotAssets,
  patch: Partial<SnapshotAssets>,
): SnapshotAssets {
  return {
    ...current,
    ...patch,
    dashboard: patch.dashboard
      ? { ...current.dashboard, ...patch.dashboard }
      : current.dashboard,
    crm: patch.crm ? { ...current.crm, ...patch.crm } : current.crm,
    emails: patch.emails
      ? { ...current.emails, ...patch.emails }
      : current.emails,
    branding: patch.branding
      ? { ...current.branding, ...patch.branding }
      : current.branding,
  };
}

export function parseNavigationJson(json: string) {
  const parsed = JSON.parse(json);
  return z.array(snapshotNavItemSchema).parse(parsed);
}

export function parseDashboardWidgetsJson(json: string) {
  const parsed = JSON.parse(json);
  return z.array(snapshotWidgetSchema).parse(parsed);
}

export function parseQuickLinksJson(json: string) {
  const parsed = JSON.parse(json);
  return z.array(snapshotQuickLinkSchema).parse(parsed);
}

export function parseAssetsJson(json: string): SnapshotAssets {
  return JSON.parse(json) as SnapshotAssets;
}

export function createSnapshotApiBody(values: {
  name: string;
  description?: string;
  assets?: SnapshotAssets;
}) {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    assets: values.assets ?? createDefaultSnapshotAssets(),
  };
}

export function buildSnapshotContextPreview(assets: SnapshotAssets) {
  return {
    snapshotId: null,
    snapshotName: assets.branding?.productName ?? "Preview",
    contextVersion: "preview",
    terminology: assets.terminology,
    navigation: assets.navigation,
    dashboard: assets.dashboard,
    branding: assets.branding ?? {},
  };
}
