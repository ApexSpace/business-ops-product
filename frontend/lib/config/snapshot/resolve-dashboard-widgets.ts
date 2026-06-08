import type {
  SnapshotDashboardWidget,
  SnapshotQuickLink,
} from "@/features/platform/types/snapshot";
import {
  DASHBOARD_WIDGET_REGISTRY,
  isKnownDashboardWidgetKey,
  type DashboardWidgetDefinition,
  type DashboardWidgetKey,
} from "./widget-registry";
import type { TerminologyResolver } from "./resolve-snapshot-navigation";

export interface ResolvedDashboardWidget extends DashboardWidgetDefinition {
  order: number;
  label: string;
}

export function resolveDashboardWidgets(
  widgets: SnapshotDashboardWidget[] | undefined,
  resolveLabel: TerminologyResolver,
): ResolvedDashboardWidget[] {
  if (!widgets?.length) return [];

  return widgets
    .filter((widget) => ("visible" in widget ? widget.visible !== false : true))
    .filter((widget) => isKnownDashboardWidgetKey(widget.key))
    .sort((a, b) => a.order - b.order)
    .map((widget) => {
      const definition = DASHBOARD_WIDGET_REGISTRY[widget.key as DashboardWidgetKey];
      return {
        ...definition,
        order: widget.order,
        label: resolveLabel(definition.labelKey, definition.key),
      };
    });
}

export interface ResolvedQuickLink {
  href: string;
  label: string;
  order: number;
}

export function resolveDashboardQuickLinks(
  quickLinks: SnapshotQuickLink[] | undefined,
  resolveLabel: TerminologyResolver,
): ResolvedQuickLink[] {
  if (!quickLinks?.length) return [];

  return quickLinks
    .filter((link) => link.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((link) => ({
      href: link.href,
      label:
        link.label ??
        (link.labelKey ? resolveLabel(link.labelKey, link.href) : link.href),
      order: link.order ?? 0,
    }));
}
