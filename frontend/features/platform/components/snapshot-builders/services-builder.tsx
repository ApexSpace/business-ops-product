"use client";

import { useLayoutEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSnapshotEditor } from "@/features/platform/hooks/use-snapshot-editor";
import type {
  SnapshotServiceAsset,
  SnapshotTagAsset,
} from "@/features/platform/types/snapshot";

function newSourceKey(prefix: "service" | "tag") {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function withoutDurationMinutes(service: SnapshotServiceAsset): SnapshotServiceAsset {
  const { durationMinutes: _duration, ...rest } = service;
  return rest;
}

export function ServicesBuilder() {
  const { assets, updateAssets, canManage } = useSnapshotEditor();
  const crm = assets?.crm ?? { pipelines: [], services: [], tags: [] };
  const services = (crm.services ?? []).map(withoutDurationMinutes);
  const tags = crm.tags ?? [];

  const updateCrm = (patch: Partial<typeof crm>) => {
    const nextServices = patch.services?.map(withoutDurationMinutes);
    updateAssets({
      crm: {
        ...crm,
        ...patch,
        ...(nextServices ? { services: nextServices } : {}),
      },
    });
  };

  const addService = () => {
    const next: SnapshotServiceAsset = {
      sourceKey: newSourceKey("service"),
      name: "New service",
      price: 0,
    };
    updateCrm({ services: [...services, next] });
  };

  const updateService = (sourceKey: string, patch: Partial<SnapshotServiceAsset>) => {
    updateCrm({
      services: services.map((s) =>
        s.sourceKey === sourceKey
          ? withoutDurationMinutes({ ...s, ...patch })
          : s,
      ),
    });
  };

  const removeService = (sourceKey: string) => {
    updateCrm({ services: services.filter((s) => s.sourceKey !== sourceKey) });
  };

  const addTag = () => {
    const next: SnapshotTagAsset = {
      sourceKey: newSourceKey("tag"),
      name: "New tag",
      color: "#6366f1",
    };
    updateCrm({ tags: [...tags, next] });
  };

  const updateTag = (sourceKey: string, patch: Partial<SnapshotTagAsset>) => {
    updateCrm({
      tags: tags.map((t) => (t.sourceKey === sourceKey ? { ...t, ...patch } : t)),
    });
  };

  const removeTag = (sourceKey: string) => {
    updateCrm({ tags: tags.filter((t) => t.sourceKey !== sourceKey) });
  };

  useLayoutEffect(() => {
    if (!canManage) return;
    const rawServices = crm.services ?? [];
    if (rawServices.some((service) => service.durationMinutes !== undefined)) {
      updateCrm({ services: rawServices.map(withoutDurationMinutes) });
    }
  }, [crm.services, canManage]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Services</CardTitle>
            <CardDescription>
              Default bookable services provisioned when this snapshot is applied to a
              business.
            </CardDescription>
          </div>
          {canManage ? (
            <Button type="button" size="sm" onClick={addService}>
              <Plus className="mr-2 size-4" />
              Add service
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services configured.</p>
          ) : (
            services.map((service) => (
              <div
                key={service.sourceKey}
                className="grid grid-cols-1 gap-3 rounded-md border p-4 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end"
              >
                <div className="min-w-0 space-y-2">
                  <Label htmlFor={`service-name-${service.sourceKey}`}>Name</Label>
                  <Input
                    id={`service-name-${service.sourceKey}`}
                    value={service.name}
                    disabled={!canManage}
                    onChange={(e) =>
                      updateService(service.sourceKey, { name: e.target.value })
                    }
                    placeholder="Service name"
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor={`service-price-${service.sourceKey}`}>Price</Label>
                  <Input
                    id={`service-price-${service.sourceKey}`}
                    type="number"
                    min={0}
                    step={0.01}
                    value={service.price ?? ""}
                    disabled={!canManage}
                    onChange={(e) =>
                      updateService(service.sourceKey, {
                        price:
                          e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 self-end"
                    onClick={() => removeService(service.sourceKey)}
                    aria-label="Remove service"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Default contact tags with colors provisioned when this snapshot is applied
              to a business.
            </CardDescription>
          </div>
          {canManage ? (
            <Button type="button" size="sm" onClick={addTag}>
              <Plus className="mr-2 size-4" />
              Add tag
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags configured.</p>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.sourceKey}
                className="grid grid-cols-1 gap-3 rounded-md border p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
              >
                <div className="min-w-0 space-y-2">
                  <Label htmlFor={`tag-name-${tag.sourceKey}`}>Name</Label>
                  <Input
                    id={`tag-name-${tag.sourceKey}`}
                    value={tag.name}
                    disabled={!canManage}
                    onChange={(e) => updateTag(tag.sourceKey, { name: e.target.value })}
                    placeholder="Tag name"
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor={`tag-color-${tag.sourceKey}`}>Color</Label>
                  <Input
                    id={`tag-color-${tag.sourceKey}`}
                    type="color"
                    value={tag.color ?? "#6366f1"}
                    disabled={!canManage}
                    onChange={(e) => updateTag(tag.sourceKey, { color: e.target.value })}
                    className="h-9 w-14 shrink-0 cursor-pointer p-1"
                  />
                </div>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 self-end"
                    onClick={() => removeTag(tag.sourceKey)}
                    aria-label="Remove tag"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
