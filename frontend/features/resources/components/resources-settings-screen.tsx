"use client";

import { useCallback, useMemo, useState } from "react";
import { Warehouse } from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { ResourceCreateForm } from "@/features/resources/components/resource-create-form";
import { ResourceGroupDetailsPanel } from "@/features/resources/components/resource-group-details-panel";
import { ResourceWorkspacePanel } from "@/features/resources/components/resource-workspace-panel";
import {
  ResourcesSidebar,
  type ResourcesSelection,
} from "@/features/resources/components/resources-sidebar";
import { useResourceGroups } from "@/features/resources/hooks/use-resource-groups";
import { useResourceMutations } from "@/features/resources/hooks/use-resource-mutations";
import { useResourcesList } from "@/features/resources/hooks/use-resources-list";
import type { ResourceListItem } from "@/features/resources/types";
import { SETTINGS_FORM_SURFACE_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

export function ResourcesSettingsScreen() {
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<ResourcesSelection>(null);
  const [createGroupId, setCreateGroupId] = useState<string | null | "ungrouped">(
    null,
  );

  const {
    data: groups,
    isLoading: groupsLoading,
    isError: groupsError,
    error: groupsErr,
    refetch: refetchGroups,
  } = useResourceGroups();

  const {
    data: resources,
    isLoading: resourcesLoading,
    isError: resourcesError,
    error: resourcesErr,
    refetch: refetchResources,
  } = useResourcesList({ search: search.trim() || undefined });

  const mutations = useResourceMutations();

  const resourcesByGroup = useMemo(() => {
    const items = resources ?? [];
    const byGroup = new Map<string | null, ResourceListItem[]>();
    for (const resource of items) {
      const key = resource.groupId;
      const list = byGroup.get(key) ?? [];
      list.push(resource);
      byGroup.set(key, list);
    }
    for (const list of byGroup.values()) {
      list.sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      );
    }
    return byGroup;
  }, [resources]);

  const select = useCallback((next: ResourcesSelection) => {
    setCreateGroupId(null);
    setSelection(next);
  }, []);

  const selectedGroup =
    selection?.type === "group"
      ? (groups ?? []).find((g) => g.id === selection.id) ?? null
      : null;

  const createGroupLabel =
    createGroupId === "ungrouped" || createGroupId === null
      ? "Ungrouped"
      : ((groups ?? []).find((g) => g.id === createGroupId)?.name ?? "Group");

  const isLoading = groupsLoading || resourcesLoading;
  const isError = groupsError || resourcesError;

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-8rem)] min-h-[520px] w-full gap-0 overflow-hidden rounded-lg border bg-card",
        SETTINGS_FORM_SURFACE_CLASS,
      )}
    >
      <ResourcesSidebar
        search={search}
        onSearchChange={setSearch}
        groups={groups ?? []}
        resourcesByGroup={resourcesByGroup}
        isLoading={isLoading}
        isError={isError}
        error={groupsError ? groupsErr : resourcesErr}
        onRetry={() => {
          void refetchGroups();
          void refetchResources();
        }}
        selection={selection}
        onSelectGroup={(id) => select({ type: "group", id })}
        onSelectResource={(id) => select({ type: "resource", id })}
        onAddResource={(groupId) => {
          setCreateGroupId(groupId ?? "ungrouped");
          setSelection(null);
        }}
        onCreateGroup={async (name) => {
          const created = await mutations.createGroup.mutateAsync(name);
          select({ type: "group", id: created.id });
        }}
        createGroupPending={mutations.createGroup.isPending}
      />

      <main className="min-w-0 flex-1 overflow-y-auto p-[var(--settings-content-padding-y)] px-[var(--settings-content-padding-x)]">
        {isError ? (
          <ApiErrorState
            error={groupsError ? groupsErr : resourcesErr}
            title="Could not load your resource catalog"
            onRetry={() => {
              void refetchGroups();
              void refetchResources();
            }}
          />
        ) : createGroupId != null ? (
          <ResourceCreateForm
            groupLabel={createGroupLabel}
            isPending={mutations.create.isPending}
            onCancel={() => setCreateGroupId(null)}
            onSubmit={(body) =>
              mutations.create.mutate(
                {
                  ...body,
                  groupId:
                    createGroupId === "ungrouped" ? null : createGroupId,
                },
                {
                  onSuccess: (resource) => {
                    setCreateGroupId(null);
                    select({ type: "resource", id: resource.id });
                  },
                },
              )
            }
          />
        ) : selection?.type === "resource" ? (
          <ResourceWorkspacePanel
            resourceId={selection.id}
            onDeleted={() => select(null)}
          />
        ) : selectedGroup ? (
          <ResourceGroupDetailsPanel
            group={selectedGroup}
            isSaving={mutations.updateGroup.isPending}
            onSave={async (name) => {
              await mutations.updateGroup.mutateAsync({
                id: selectedGroup.id,
                name,
              });
            }}
            onDelete={() => {
              mutations.removeGroup.mutate(selectedGroup.id, {
                onSuccess: () => select(null),
              });
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Warehouse className="mb-3 size-10 opacity-40" aria-hidden />
            <h2 className="text-lg font-semibold">Manage your resources</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Select a group or resource, or add a new one from the sidebar.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
