"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/components/forms/search-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type {
  ModuleSelections,
  RegistryModuleCatalog,
} from "@/features/platform/types/capability";
import { groupModuleOptions } from "@/features/platform/utils/module-options";

export function CapabilityModulesTab({
  canManage,
  catalog,
  moduleSelections,
  isDirty,
  isAssignedLoading,
  onToggleModuleMaster,
  onToggleModuleOption,
  onReset,
}: {
  canManage: boolean;
  catalog: RegistryModuleCatalog[];
  moduleSelections: ModuleSelections;
  isDirty: boolean;
  isAssignedLoading: boolean;
  onToggleModuleMaster: (moduleKey: string, enabled: boolean) => void;
  onToggleModuleOption: (
    moduleKey: string,
    optionKey: string,
    enabled: boolean,
  ) => void;
  onReset: () => void;
}) {
  const [search, setSearch] = useState("");

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (mod) =>
        mod.name.toLowerCase().includes(q) ||
        mod.moduleKey.toLowerCase().includes(q) ||
        (mod.description?.toLowerCase().includes(q) ?? false) ||
        mod.availableOptions.some(
          (opt) =>
            opt.name.toLowerCase().includes(q) ||
            opt.key.toLowerCase().includes(q) ||
            (opt.group?.toLowerCase().includes(q) ?? false),
        ),
    );
  }, [catalog, search]);

  if (isAssignedLoading) {
    return <p className="text-sm text-muted-foreground">Loading modules…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-medium">Platform modules</h3>
          <p className="text-sm text-muted-foreground">
            Enable modules and choose which features are included in this
            capability bundle.
          </p>
        </div>
        {canManage && isDirty ? (
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            Reset
          </Button>
        ) : null}
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search modules…"
        className="max-w-sm"
      />

      {filteredCatalog.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          No modules match your search.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCatalog.map((mod) => {
            const selection = moduleSelections[mod.moduleKey];
            const enabled = selection?.enabled ?? false;
            const options = selection?.options ?? {};
            const optionGroups = groupModuleOptions(mod.availableOptions);

            return (
              <section
                key={mod.moduleKey}
                className="space-y-4 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-sm font-medium">{mod.name}</h4>
                    {mod.description ? (
                      <p className="text-sm text-muted-foreground">
                        {mod.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Label
                      htmlFor={`${mod.moduleKey}-master`}
                      className="text-sm font-normal text-muted-foreground"
                    >
                      Enable
                    </Label>
                    <Switch
                      id={`${mod.moduleKey}-master`}
                      checked={enabled}
                      disabled={!canManage}
                      onCheckedChange={(checked) =>
                        onToggleModuleMaster(mod.moduleKey, checked)
                      }
                      aria-label={`Enable ${mod.name}`}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {optionGroups.map(({ group, options: groupOptions }) => (
                    <div key={group ?? "default"} className="space-y-2">
                      {group ? (
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {group}
                        </p>
                      ) : null}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {groupOptions.map((opt) => {
                          const checked = options[opt.key] ?? false;
                          const optId = `${mod.moduleKey}-${opt.key}`;
                          return (
                            <div
                              key={opt.key}
                              className="flex items-start gap-2 rounded-md border border-border/60 px-3 py-2"
                            >
                              <Checkbox
                                id={optId}
                                checked={checked}
                                disabled={!canManage || !enabled}
                                className="mt-0.5"
                                onCheckedChange={(value) =>
                                  onToggleModuleOption(
                                    mod.moduleKey,
                                    opt.key,
                                    value === true,
                                  )
                                }
                              />
                              <div className="min-w-0 space-y-0.5">
                                <Label
                                  htmlFor={optId}
                                  className="cursor-pointer text-sm font-normal leading-snug"
                                >
                                  {opt.name}
                                </Label>
                                {opt.description ? (
                                  <p className="text-xs text-muted-foreground">
                                    {opt.description}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
