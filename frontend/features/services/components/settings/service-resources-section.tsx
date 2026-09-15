"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DrawerAddAction } from "@/components/drawer/drawer-add-action";
import { SettingsChoiceRadioGroup } from "@/components/forms/settings-choice-radio-group";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listResources } from "@/features/resources/api/resources.api";
import { useResourceGroups } from "@/features/resources/hooks/use-resource-groups";
import type { ServiceResourceRequirement } from "@/features/services/api/service-workspace.api";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import { SETTINGS_FORM_DESCRIPTION_CLASS } from "@/lib/design/settings-form-tokens";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";
import { queryKeys } from "@/lib/query/keys";

type RequirementDraft = {
  groupId: string;
  selectionMode: "ALL" | "SPECIFIC";
  resourceIds: string[];
};

type Props = {
  items: ServiceResourceRequirement[];
  emphasize?: boolean;
  isSaving?: boolean;
  onAdd: (body: {
    groupId: string;
    selectionMode: "ALL" | "SPECIFIC";
    resourceIds?: string[];
  }) => Promise<void>;
  onUpdate: (
    id: string,
    body: {
      groupId: string;
      selectionMode: "ALL" | "SPECIFIC";
      resourceIds?: string[];
    },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function emptyDraft(): RequirementDraft {
  return { groupId: "", selectionMode: "ALL", resourceIds: [] };
}

function draftFromItem(item: ServiceResourceRequirement): RequirementDraft {
  return {
    groupId: item.groupId ?? "",
    selectionMode: item.selectionMode,
    resourceIds: [...item.resourceIds],
  };
}

function resourcesSummary(item: ServiceResourceRequirement): string {
  if (item.selectionMode === "ALL") {
    return "All resources of group";
  }
  if (item.resources.length === 0) return "None selected";
  return item.resources.map((r) => r.name).join(", ");
}

export function ServiceResourcesSection({
  items,
  emphasize = false,
  isSaving = false,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const { isEditing, startEdit, stopEdit, editingSection } =
    useSettingsSectionEdit<string>();
  const { data: groups = [] } = useResourceGroups();

  const [drafts, setDrafts] = useState<Record<string, RequirementDraft>>({});
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<RequirementDraft>(emptyDraft());
  const [baselines, setBaselines] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, RequirementDraft> = {};
    const nextBaselines: Record<string, string> = {};
    for (const item of items) {
      const draft = draftFromItem(item);
      next[item.id] = draft;
      nextBaselines[item.id] = JSON.stringify(draft);
    }
    setDrafts(next);
    setBaselines(nextBaselines);
    setCreating(false);
    setCreateDraft(emptyDraft());
    stopEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const editingId =
    editingSection && editingSection !== "create" ? editingSection : null;

  return (
    <div className="space-y-6">
      {emphasize ? (
        <p className="text-sm text-amber-700">
          Required for resource-only services.
        </p>
      ) : null}

      <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>
        Link resource groups required to perform this service. Manage the
        catalog under Settings → Resources.
      </p>

      {items.length === 0 && !creating ? (
        <p className="text-sm text-muted-foreground">
          No resource requirements yet.
        </p>
      ) : null}

      {items.map((item) => {
        const draft = drafts[item.id] ?? draftFromItem(item);
        const dirty =
          JSON.stringify(draft) !== (baselines[item.id] ?? JSON.stringify(draft));
        return (
          <SettingsInlineEditSection
            key={item.id}
            title="Resource Requirement"
            summary={
              <SettingsViewRows
                rows={[
                  {
                    label: "Resource Group",
                    value: item.groupName ?? "Not set",
                  },
                  {
                    label: "Resources",
                    value: resourcesSummary(item),
                  },
                ]}
              />
            }
            isEditing={isEditing(item.id)}
            onEdit={() => startEdit(item.id)}
            onDiscard={() => {
              setDrafts((prev) => ({
                ...prev,
                [item.id]: draftFromItem(item),
              }));
              stopEdit();
            }}
            onSave={() =>
              void (async () => {
                if (!draft.groupId) return;
                await onUpdate(item.id, {
                  groupId: draft.groupId,
                  selectionMode: draft.selectionMode,
                  resourceIds:
                    draft.selectionMode === "SPECIFIC"
                      ? draft.resourceIds
                      : undefined,
                });
                stopEdit();
              })()
            }
            isDirty={dirty}
            isSaving={isSaving && editingId === item.id}
          >
            <RequirementEditor
              draft={draft}
              groups={groups}
              onChange={(next) =>
                setDrafts((prev) => ({ ...prev, [item.id]: next }))
              }
              onDelete={() =>
                void onDelete(item.id).then(() => {
                  stopEdit();
                })
              }
            />
          </SettingsInlineEditSection>
        );
      })}

      {creating ? (
        <SettingsInlineEditSection
          title="Resource Requirement"
          summary={<span className="sr-only">New requirement</span>}
          isEditing
          onEdit={() => undefined}
          onDiscard={() => {
            setCreating(false);
            setCreateDraft(emptyDraft());
            stopEdit();
          }}
          onSave={() =>
            void (async () => {
              if (!createDraft.groupId) return;
              await onAdd({
                groupId: createDraft.groupId,
                selectionMode: createDraft.selectionMode,
                resourceIds:
                  createDraft.selectionMode === "SPECIFIC"
                    ? createDraft.resourceIds
                    : undefined,
              });
              setCreating(false);
              setCreateDraft(emptyDraft());
              stopEdit();
            })()
          }
          isDirty={Boolean(createDraft.groupId)}
          isSaving={isSaving}
        >
          <RequirementEditor
            draft={createDraft}
            groups={groups}
            onChange={setCreateDraft}
          />
        </SettingsInlineEditSection>
      ) : (
        <DrawerAddAction
          label="Add resource requirement"
          size="page"
          onClick={() => {
            setCreating(true);
            setCreateDraft(emptyDraft());
            startEdit("create");
          }}
        />
      )}
    </div>
  );
}

function RequirementEditor({
  draft,
  groups,
  onChange,
  onDelete,
}: {
  draft: RequirementDraft;
  groups: Array<{ id: string; name: string }>;
  onChange: (draft: RequirementDraft) => void;
  onDelete?: () => void;
}) {
  const { data: groupResources = [] } = useQuery({
    queryKey: queryKeys.resources.list({ groupId: draft.groupId || undefined }),
    queryFn: () => listResources({ groupId: draft.groupId }),
    enabled: Boolean(draft.groupId),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Resource Group</Label>
        <Select
          value={draft.groupId || undefined}
          onValueChange={(value) =>
            onChange({
              ...draft,
              groupId: value ?? "",
              resourceIds: [],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select resource group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SettingsChoiceRadioGroup
        name="selection-mode"
        aria-label="Resource selection"
        value={draft.selectionMode}
        onValueChange={(value) =>
          onChange({
            ...draft,
            selectionMode: value as "ALL" | "SPECIFIC",
            resourceIds: value === "ALL" ? [] : draft.resourceIds,
          })
        }
        options={[
          {
            value: "ALL",
            label: "All resources of group",
            description: "Any resource in this group can fulfill the requirement.",
          },
          {
            value: "SPECIFIC",
            label: "Specific resources",
            description: "Only the selected resources can fulfill the requirement.",
            children: draft.groupId ? (
              <div className="space-y-3">
                {groupResources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No resources in this group yet.
                  </p>
                ) : (
                  groupResources.map((resource) => {
                    const checked = draft.resourceIds.includes(resource.id);
                    return (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <Label className="text-sm font-medium">
                          {resource.name}
                        </Label>
                        <Switch
                          checked={checked}
                          onCheckedChange={(next) => {
                            const resourceIds = next
                              ? [...draft.resourceIds, resource.id]
                              : draft.resourceIds.filter(
                                  (id) => id !== resource.id,
                                );
                            onChange({ ...draft, resourceIds });
                          }}
                          className={DRAWER_SWITCH_CLASS}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a resource group first.
              </p>
            ),
          },
        ]}
      />

      {onDelete ? (
        <button
          type="button"
          className="text-sm text-destructive underline-offset-4 hover:underline"
          onClick={onDelete}
        >
          Remove requirement
        </button>
      ) : null}
    </div>
  );
}
