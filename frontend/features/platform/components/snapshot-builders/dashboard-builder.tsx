"use client";

import { useMemo } from "react";
import { rectSortingStrategy } from "@dnd-kit/sortable";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DASHBOARD_WIDGET_REGISTRY,
  getEditableDashboardWidgetKeys,
  type DashboardWidgetKey,
} from "@/lib/config/snapshot/widget-registry";
import { useSnapshotEditor } from "@/features/platform/hooks/use-snapshot-editor";
import { SortableList } from "@/features/platform/components/snapshot-builders/sortable-list";
import type { SnapshotDashboardWidget } from "@/features/platform/types/snapshot";

export function DashboardBuilder() {
  const { assets, updateAssets, canManage } = useSnapshotEditor();
  const widgets = assets?.dashboard.widgets ?? [];

  const editableKeys = useMemo(() => getEditableDashboardWidgetKeys(), []);
  const editableKeySet = useMemo(() => new Set(editableKeys), [editableKeys]);

  const orderedItems = useMemo(() => {
    const sorted = [...widgets]
      .filter((widget) => editableKeySet.has(widget.key as DashboardWidgetKey))
      .sort((a, b) => a.order - b.order);
    const sortedKeys = new Set(sorted.map((widget) => widget.key));
    const missing = editableKeys.filter((key) => !sortedKeys.has(key));

    return [
      ...sorted.map((widget) => ({ ...widget, id: widget.key })),
      ...missing.map((key, index) => ({
        key,
        id: key,
        order: (sorted.length + index) * 10,
        visible: false,
      })),
    ];
  }, [widgets, editableKeys, editableKeySet]);

  const commitWidgets = (next: SnapshotDashboardWidget[]) => {
    updateAssets({
      dashboard: {
        ...assets!.dashboard,
        widgets: next.map((widget, index) => ({
          ...widget,
          order: index * 10,
        })),
      },
    });
  };

  const reorderWidgets = (items: Array<SnapshotDashboardWidget & { id: string }>) => {
    const keyOrder = new Map(items.map((item, index) => [item.key, index]));
    commitWidgets(
      widgets
        .slice()
        .sort(
          (a, b) =>
            (keyOrder.get(a.key) ?? Number.MAX_SAFE_INTEGER) -
            (keyOrder.get(b.key) ?? Number.MAX_SAFE_INTEGER),
        ),
    );
  };

  const toggleWidget = (key: DashboardWidgetKey, enabled: boolean) => {
    if (enabled) {
      const existing = widgets.find((widget) => widget.key === key);
      if (existing) {
        commitWidgets(
          widgets.map((widget) =>
            widget.key === key ? { ...widget, visible: true } : widget,
          ),
        );
        return;
      }

      const orderIndex = orderedItems.findIndex((widget) => widget.key === key);
      commitWidgets([
        ...widgets,
        { key, order: orderIndex * 10, visible: true },
      ]);
      return;
    }

    if (widgets.some((widget) => widget.key === key)) {
      commitWidgets(
        widgets.map((widget) =>
          widget.key === key ? { ...widget, visible: false } : widget,
        ),
      );
    }
  };

  const isEnabled = (key: string) => {
    const widget = widgets.find((item) => item.key === key);
    return !!widget && widget.visible !== false;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard widgets</CardTitle>
          <CardDescription>
            Choose stat cards on the business dashboard and drag to set their order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SortableList
            items={orderedItems}
            disabled={!canManage}
            onReorder={reorderWidgets}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            sortingStrategy={rectSortingStrategy}
            renderItem={(item) => {
              const def = DASHBOARD_WIDGET_REGISTRY[item.key as DashboardWidgetKey];
              const Icon = def?.icon;
              return (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
                    <div>
                      <p className="text-sm font-medium">{def?.labelKey ?? item.key}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled(item.key)}
                    disabled={!canManage}
                    onCheckedChange={(checked) =>
                      toggleWidget(item.key as DashboardWidgetKey, checked)
                    }
                  />
                </div>
              );
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
