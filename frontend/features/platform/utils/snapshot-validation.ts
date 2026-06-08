import { isKnownSnapshotRoute } from "@/lib/config/snapshot/route-registry";
import { SNAPSHOT_ICON_REGISTRY } from "@/lib/config/snapshot/icon-registry";
import { isKnownDashboardWidgetKey } from "@/lib/config/snapshot/widget-registry";
import { EMAIL_TYPE_OPTIONS } from "@/features/email-notifications/api/email-notifications.api";
import type { Snapshot, SnapshotAssets } from "@/features/platform/types/snapshot";

export type ValidationSeverity = "error" | "warning" | "success";

export interface SnapshotValidationItem {
  id: string;
  severity: ValidationSeverity;
  message: string;
  section?: string;
}

const CONFIGURABLE_EMAIL_TYPES = new Set(
  EMAIL_TYPE_OPTIONS.map((option) => option.value),
);

function hasTerminology(assets: SnapshotAssets): boolean {
  return Object.keys(assets.terminology ?? {}).length > 0;
}

function validateNavigation(assets: SnapshotAssets): SnapshotValidationItem[] {
  const items: SnapshotValidationItem[] = [];
  const navigation = assets.navigation ?? [];

  if (navigation.length === 0) {
    items.push({
      id: "nav-empty",
      severity: "error",
      message: "At least one navigation item is required.",
      section: "navigation",
    });
  }

  const keys = new Set<string>();
  for (const item of navigation) {
    if (!item.key?.trim()) {
      items.push({
        id: `nav-key-${item.route}`,
        severity: "error",
        message: "Every menu item needs an internal key.",
        section: "navigation",
      });
    } else if (keys.has(item.key)) {
      items.push({
        id: `nav-dup-${item.key}`,
        severity: "error",
        message: `Duplicate menu key "${item.key}".`,
        section: "navigation",
      });
    } else {
      keys.add(item.key);
    }

    if (!isKnownSnapshotRoute(item.route)) {
      items.push({
        id: `nav-route-${item.key}`,
        severity: "error",
        message: `Unknown route "${item.route}" for menu item "${item.key}".`,
        section: "navigation",
      });
    }

    if (!SNAPSHOT_ICON_REGISTRY[item.icon]) {
      items.push({
        id: `nav-icon-${item.key}`,
        severity: "warning",
        message: `Unrecognized icon "${item.icon}" on "${item.key}". A default icon will be used.`,
        section: "navigation",
      });
    }
  }

  if (items.length === 0 && navigation.length > 0) {
    items.push({
      id: "nav-ok",
      severity: "success",
      message: `${navigation.length} navigation items configured.`,
      section: "navigation",
    });
  }

  return items;
}

function validateDashboard(assets: SnapshotAssets): SnapshotValidationItem[] {
  const items: SnapshotValidationItem[] = [];
  const widgets = assets.dashboard?.widgets ?? [];

  if (widgets.length === 0) {
    items.push({
      id: "dash-empty",
      severity: "warning",
      message: "No dashboard widgets selected. The dashboard may look empty.",
      section: "dashboard",
    });
  }

  for (const widget of widgets) {
    if (!isKnownDashboardWidgetKey(widget.key)) {
      items.push({
        id: `widget-${widget.key}`,
        severity: "error",
        message: `Unknown dashboard widget "${widget.key}".`,
        section: "dashboard",
      });
    }
  }

  for (const link of assets.dashboard?.quickLinks ?? []) {
    if (!isKnownSnapshotRoute(link.href)) {
      items.push({
        id: `quicklink-${link.href}`,
        severity: "error",
        message: `Unknown quick link route "${link.href}".`,
        section: "dashboard",
      });
    }
  }

  if (items.length === 0 && widgets.length > 0) {
    items.push({
      id: "dash-ok",
      severity: "success",
      message: `${widgets.length} dashboard widgets configured.`,
      section: "dashboard",
    });
  }

  return items;
}

function validateServices(assets: SnapshotAssets): SnapshotValidationItem[] {
  const items: SnapshotValidationItem[] = [];
  const services = assets.crm?.services ?? [];

  for (const service of services) {
    if (!service.name?.trim()) {
      items.push({
        id: `service-name-${service.sourceKey}`,
        severity: "error",
        message: "Every service needs a name.",
        section: "services",
      });
    }
  }

  if (services.length > 0 && items.length === 0) {
    items.push({
      id: "services-ok",
      severity: "success",
      message: `${services.length} service(s) configured.`,
      section: "services",
    });
  }

  return items;
}

function validateTags(assets: SnapshotAssets): SnapshotValidationItem[] {
  const items: SnapshotValidationItem[] = [];
  const tags = assets.crm?.tags ?? [];

  for (const tag of tags) {
    if (!tag.name?.trim()) {
      items.push({
        id: `tag-name-${tag.sourceKey}`,
        severity: "error",
        message: "Every tag needs a name.",
        section: "services",
      });
    }
  }

  if (tags.length > 0 && items.length === 0) {
    items.push({
      id: "tags-ok",
      severity: "success",
      message: `${tags.length} tag(s) configured.`,
      section: "services",
    });
  }

  return items;
}

function validateCrm(assets: SnapshotAssets): SnapshotValidationItem[] {
  const items: SnapshotValidationItem[] = [];
  const pipelines = assets.crm?.pipelines ?? [];

  for (const pipeline of pipelines) {
    if (!pipeline.name?.trim()) {
      items.push({
        id: `pipeline-name-${pipeline.sourceKey}`,
        severity: "error",
        message: "Every pipeline needs a name.",
        section: "crm",
      });
    }
    if ((pipeline.stages ?? []).length === 0) {
      items.push({
        id: `pipeline-stages-${pipeline.sourceKey}`,
        severity: "warning",
        message: `Pipeline "${pipeline.name || pipeline.sourceKey}" has no stages.`,
        section: "crm",
      });
    }
  }

  if (pipelines.length > 0 && items.length === 0) {
    items.push({
      id: "crm-ok",
      severity: "success",
      message: `${pipelines.length} CRM pipeline(s) configured.`,
      section: "crm",
    });
  }

  return items;
}

function validateEmails(assets: SnapshotAssets): SnapshotValidationItem[] {
  const items: SnapshotValidationItem[] = [];

  for (const pref of assets.emails?.preferences ?? []) {
    if (!CONFIGURABLE_EMAIL_TYPES.has(pref.emailType as (typeof EMAIL_TYPE_OPTIONS)[number]["value"])) {
      items.push({
        id: `email-pref-${pref.emailType}`,
        severity: "error",
        message: `Invalid email notification type "${pref.emailType}".`,
        section: "emails",
      });
    }
  }

  for (const tmpl of assets.emails?.templates ?? []) {
    if (!CONFIGURABLE_EMAIL_TYPES.has(tmpl.emailType as (typeof EMAIL_TYPE_OPTIONS)[number]["value"])) {
      items.push({
        id: `email-tmpl-type-${tmpl.emailType}`,
        severity: "error",
        message: `Invalid email template type "${tmpl.emailType}".`,
        section: "emails",
      });
    }
    if (!tmpl.subject?.trim()) {
      items.push({
        id: `email-subject-${tmpl.emailType}`,
        severity: "warning",
        message: `Email template "${tmpl.emailType}" is missing a subject.`,
        section: "emails",
      });
    }
  }

  return items;
}

export function validateSnapshotForPublish(
  snapshot: Pick<Snapshot, "name" | "assets">,
): SnapshotValidationItem[] {
  const items: SnapshotValidationItem[] = [];

  if (!snapshot.name?.trim() || snapshot.name.trim().length < 2) {
    items.push({
      id: "name",
      severity: "error",
      message: "Snapshot name must be at least 2 characters.",
      section: "overview",
    });
  } else {
    items.push({
      id: "name-ok",
      severity: "success",
      message: "Snapshot name is set.",
      section: "overview",
    });
  }

  if (!hasTerminology(snapshot.assets)) {
    items.push({
      id: "terminology-empty",
      severity: "warning",
      message: "No custom terminology labels defined.",
      section: "labels",
    });
  } else {
    items.push({
      id: "terminology-ok",
      severity: "success",
      message: "Entity labels are configured.",
      section: "labels",
    });
  }

  items.push(
    ...validateNavigation(snapshot.assets),
    ...validateDashboard(snapshot.assets),
    ...validateCrm(snapshot.assets),
    ...validateServices(snapshot.assets),
    ...validateTags(snapshot.assets),
    ...validateEmails(snapshot.assets),
  );

  return items;
}

export function hasBlockingValidationErrors(items: SnapshotValidationItem[]): boolean {
  return items.some((item) => item.severity === "error");
}
