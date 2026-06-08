"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { businessOperationalMenuItems } from "@/lib/config/navigation/business-menu";
import { businessSettingsNavItems } from "@/lib/config/navigation/business-settings-menu";
import { SNAPSHOT_ICON_REGISTRY } from "@/lib/config/snapshot/icon-registry";
import { DEFAULT_SNAPSHOT_NAVIGATION } from "@/lib/config/snapshot/default-snapshot-context";
import { resolveSnapshotIcon } from "@/lib/config/snapshot/icon-registry";
import { useSnapshotEditor } from "@/features/platform/hooks/use-snapshot-editor";
import { SortableList } from "@/features/platform/components/snapshot-builders/sortable-list";
import type { SnapshotNavItem } from "@/features/platform/types/snapshot";

const ROUTE_OPTIONS = [
  ...businessOperationalMenuItems.map((item) => ({
    value: item.href,
    label: item.title,
  })),
  ...businessSettingsNavItems.map((item) => ({
    value: item.href,
    label: `Settings · ${item.title}`,
  })),
];

const ICON_OPTIONS = Object.keys(SNAPSHOT_ICON_REGISTRY).map((key) => ({
  value: key,
  label: key.replace(/-/g, " "),
}));

function defaultLabelKeyForRoute(route: string): string {
  const nav = DEFAULT_SNAPSHOT_NAVIGATION.find((item) => item.route === route);
  return nav?.labelKey ?? "nav.dashboard";
}

function routeTitle(route: string): string {
  return ROUTE_OPTIONS.find((option) => option.value === route)?.label ?? route;
}

export function NavigationBuilder() {
  const { assets, updateAssets, canManage } = useSnapshotEditor();
  const navigation = assets?.navigation ?? [];

  const selectedRoutes = useMemo(
    () => new Set(navigation.map((item) => item.route)),
    [navigation],
  );

  const availableRoutes = ROUTE_OPTIONS.filter(
    (option) => !selectedRoutes.has(option.value),
  );

  const sortableItems = navigation.map((item) => ({
    ...item,
    id: item.key,
  }));

  const commitNavigation = (items: SnapshotNavItem[]) => {
    updateAssets({
      navigation: items.map((item, index) => ({
        ...item,
        order: index * 10,
      })),
    });
  };

  const addRoute = (route: string) => {
    const key = route.split("/").filter(Boolean).pop() ?? `item-${Date.now()}`;
    const defaultNav = DEFAULT_SNAPSHOT_NAVIGATION.find((n) => n.route === route);
    const next: SnapshotNavItem = {
      key: defaultNav?.key ?? key,
      route,
      icon: defaultNav?.icon ?? "layout-dashboard",
      labelKey: defaultLabelKeyForRoute(route),
      order: navigation.length * 10,
      visible: true,
    };
    commitNavigation([...navigation, next]);
  };

  const removeItem = (key: string) => {
    commitNavigation(navigation.filter((item) => item.key !== key));
  };

  const updateItem = (key: string, patch: Partial<SnapshotNavItem>) => {
    commitNavigation(
      navigation.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Navigation menu</CardTitle>
          <CardDescription>
            Choose which pages appear in the business sidebar, set icons, and drag
            to reorder. Hidden items stay configured but won&apos;t show to users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && availableRoutes.length > 0 ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[240px] flex-1">
                <Label>Add page to menu</Label>
                <SearchableSelect
                  items={availableRoutes}
                  value={null}
                  onValueChange={(route) => route && addRoute(route)}
                  placeholder="Select a page…"
                />
              </div>
            </div>
          ) : null}

          <SortableList
            items={sortableItems}
            disabled={!canManage}
            onReorder={(items) =>
              commitNavigation(items.map(({ id: _id, ...rest }) => rest))
            }
            renderItem={(item) => {
              const Icon = resolveSnapshotIcon(item.icon);
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="font-medium">{routeTitle(item.route)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`visible-${item.key}`} className="text-xs">
                        Visible
                      </Label>
                      <Switch
                        id={`visible-${item.key}`}
                        checked={item.visible !== false}
                        disabled={!canManage}
                        onCheckedChange={(checked) =>
                          updateItem(item.key, { visible: checked })
                        }
                      />
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.key)}
                          aria-label="Remove menu item"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Page route</Label>
                      <SearchableSelect
                        items={ROUTE_OPTIONS}
                        value={item.route}
                        onValueChange={(route) =>
                          route &&
                          updateItem(item.key, {
                            route,
                            labelKey: defaultLabelKeyForRoute(route),
                          })
                        }
                        placeholder="Route"
                        disabled={!canManage}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Icon</Label>
                      <SearchableSelect
                        items={ICON_OPTIONS}
                        value={item.icon}
                        onValueChange={(icon) => icon && updateItem(item.key, { icon })}
                        placeholder="Icon"
                        disabled={!canManage}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Label key</Label>
                      <Input
                        value={item.labelKey}
                        disabled={!canManage}
                        onChange={(e) =>
                          updateItem(item.key, { labelKey: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            }}
          />

          {navigation.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No menu items yet. Add pages from the selector above.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available pages</CardTitle>
          <CardDescription>
            Pages not yet in the menu. Click to add.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {availableRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">All pages are in the menu.</p>
          ) : (
            availableRoutes.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                size="sm"
                disabled={!canManage}
                onClick={() => addRoute(option.value)}
              >
                <Plus className="mr-1 size-3" />
                {option.label}
              </Button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
