"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_TERMINOLOGY } from "@/lib/config/snapshot/default-terminology";
import {
  ACTION_LABEL_KEYS,
  ENTITY_DISPLAY_NAMES,
  ENTITY_FIELD_LABELS,
  ENTITY_LABEL_FIELDS,
  ORPHAN_NAV_FIELD_LABELS,
  ORPHAN_NAV_LABEL_KEYS,
  SNAPSHOT_ENTITIES,
  deriveOrphanNavLabelKeys,
  type EntityLabelField,
  type SnapshotEntityId,
  entityFieldToKey,
  expandEntityLabels,
  flattenEntityLabels,
  resetEntityLabels,
} from "@/lib/config/snapshot/entity-label-registry";

const orphanNavLabelKeys = ORPHAN_NAV_LABEL_KEYS ?? deriveOrphanNavLabelKeys();
import { useSnapshotEditor } from "@/features/platform/hooks/use-snapshot-editor";

const ACTION_FIELD_LABELS: Record<(typeof ACTION_LABEL_KEYS)[number], string> =
  {
    "actions.bookAppointment": "Book appointment",
  };

export function EntityLabelsBuilder() {
  const { assets, updateAssets, canManage } = useSnapshotEditor();
  const terminology = assets?.terminology ?? {};
  const [openSection, setOpenSection] = useState<string | undefined>(undefined);

  const entityLabels = useMemo(
    () => expandEntityLabels(terminology),
    [terminology],
  );

  const handleAccordionChange = (value: string[]) => {
    setOpenSection(value[0]);
  };

  const updateEntityField = (
    entityId: SnapshotEntityId,
    field: EntityLabelField,
    value: string,
  ) => {
    if (!assets) return;
    const expanded = expandEntityLabels(assets.terminology);
    expanded[entityId] = { ...expanded[entityId], [field]: value };
    updateAssets({
      terminology: flattenEntityLabels(expanded, assets.terminology),
    });
  };

  const updateFlatKey = (key: string, value: string) => {
    if (!assets) return;
    updateAssets({
      terminology: {
        ...assets.terminology,
        [key]: value,
      },
    });
  };

  const resetEntity = (entityId: SnapshotEntityId) => {
    if (!assets) return;
    updateAssets({
      terminology: resetEntityLabels(entityId, assets.terminology),
    });
  };

  const resetAll = () => {
    updateAssets({ terminology: { ...DEFAULT_TERMINOLOGY } });
  };

  const resolveValue = (key: string) =>
    terminology[key] ?? DEFAULT_TERMINOLOGY[key] ?? "";

  const resolveDefault = (key: string) => DEFAULT_TERMINOLOGY[key] ?? "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Labels</CardTitle>
            <CardDescription>
              Customize sidebar, entity, and action labels shown across the
              business app—without exposing internal key names.
            </CardDescription>
          </div>
          {canManage ? (
            <Button type="button" variant="outline" size="sm" onClick={resetAll}>
              <RotateCcw className="mr-2 size-4" />
              Reset all to defaults
            </Button>
          ) : null}
        </CardHeader>
      </Card>

      <Accordion
        value={openSection ? [openSection] : []}
        onValueChange={handleAccordionChange}
        className="rounded-lg border px-4"
      >
        {orphanNavLabelKeys.length > 0 ? (
          <AccordionItem value="orphan-nav">
            <AccordionTrigger className="py-3 hover:no-underline">
              <span className="font-medium">App navigation</span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Sidebar labels for app-wide pages not tied to a specific entity.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {orphanNavLabelKeys.map((key) => (
                  <div key={key} className="space-y-1.5 rounded-md border p-3">
                    <Label htmlFor={key} className="text-sm font-medium">
                      {ORPHAN_NAV_FIELD_LABELS[key]}
                    </Label>
                    <Input
                      id={key}
                      value={resolveValue(key)}
                      disabled={!canManage}
                      onChange={(e) => updateFlatKey(key, e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: {resolveDefault(key) || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {SNAPSHOT_ENTITIES.map((entityId) => {
          const labels = entityLabels[entityId];
          return (
            <AccordionItem key={entityId} value={entityId}>
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="font-medium">
                  {ENTITY_DISPLAY_NAMES[entityId]}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Sidebar label plus WordPress-style labels for lists, forms,
                    and empty states.
                  </p>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => resetEntity(entityId)}
                    >
                      <RotateCcw className="mr-2 size-4" />
                      Reset entity
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ENTITY_LABEL_FIELDS.map((field) => {
                    const defaultValue =
                      DEFAULT_TERMINOLOGY[entityFieldToKey(entityId, field)] ??
                      "";
                    const isNavField = field === "menu_name";
                    return (
                      <div
                        key={field}
                        className={
                          isNavField
                            ? "space-y-1.5 rounded-md border border-primary/30 bg-primary/5 p-3 sm:col-span-2 lg:col-span-1"
                            : "space-y-1.5 rounded-md border p-3"
                        }
                      >
                        <Label
                          htmlFor={`${entityId}-${field}`}
                          className="text-sm font-medium"
                        >
                          {ENTITY_FIELD_LABELS[field]}
                        </Label>
                        <Input
                          id={`${entityId}-${field}`}
                          value={labels[field] ?? ""}
                          disabled={!canManage}
                          onChange={(e) =>
                            updateEntityField(entityId, field, e.target.value)
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Default: {defaultValue || "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}

        <AccordionItem value="actions-public">
          <AccordionTrigger className="py-3 hover:no-underline">
            <span className="font-medium">Actions &amp; public</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Customer-facing action labels such as booking flows.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ACTION_LABEL_KEYS.map((key) => (
                <div key={key} className="space-y-1.5 rounded-md border p-3">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {ACTION_FIELD_LABELS[key]}
                  </Label>
                  <Input
                    id={key}
                    value={resolveValue(key)}
                    disabled={!canManage}
                    onChange={(e) => updateFlatKey(key, e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default: {resolveDefault(key) || "—"}
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
