"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveSnapshotNavigation } from "@/lib/config/snapshot/resolve-snapshot-navigation";
import { resolveDashboardWidgets } from "@/lib/config/snapshot/resolve-dashboard-widgets";
import { createTerminologyResolver } from "@/lib/snapshot/resolve-terminology";
import type { SnapshotAssets } from "@/features/platform/types/snapshot";
import { buildSnapshotContextPreview } from "@/features/platform/schemas/snapshot-form";

interface SnapshotPreviewPanelProps {
  assets: SnapshotAssets;
  expanded?: boolean;
}

export function SnapshotPreviewPanel({
  assets,
  expanded = false,
}: SnapshotPreviewPanelProps) {
  const context = useMemo(() => buildSnapshotContextPreview(assets), [assets]);
  const resolveLabel = useMemo(
    () => createTerminologyResolver(context.terminology),
    [context.terminology],
  );

  const navSections = useMemo(
    () =>
      resolveSnapshotNavigation({
        navigation: context.navigation,
        resolveLabel,
        isPlatformAdmin: true,
      }),
    [context.navigation, resolveLabel],
  );

  const widgets = useMemo(
    () => resolveDashboardWidgets(context.dashboard.widgets, resolveLabel),
    [context.dashboard.widgets, resolveLabel],
  );

  const branding = assets.branding ?? {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Sidebar preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {navSections.flatMap((section) =>
            section.items.map((item) => (
              <div
                key={item.href}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground"
              >
                <item.icon className="size-4 shrink-0" />
                <span>{item.title}</span>
              </div>
            )),
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Dashboard widgets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {widgets.length === 0 ? (
            <p className="text-muted-foreground">No widgets configured.</p>
          ) : (
            widgets.map((widget) => (
              <div
                key={widget.key}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground"
              >
                <widget.icon className="size-4 shrink-0" />
                <span>{widget.label}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {expanded ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Branding accent</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-md px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: branding.accentColor ?? "#6366f1" }}
            >
              {branding.productName ?? context.snapshotName}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
