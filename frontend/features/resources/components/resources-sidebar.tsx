"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { DrawerAddAction } from "@/components/drawer/drawer-add-action";
import { FormDialog } from "@/components/forms/form-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { TextField } from "@/components/forms/text-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ResourceGroup,
  ResourceListItem,
} from "@/features/resources/types";
import {
  resourceGroupNameDefaults,
  resourceGroupNameSchema,
  type ResourceGroupNameFormValues,
} from "@/features/resources/schemas/resource-group-name";
import {
  WORKSPACE_NAV_ITEM_ACTIVE_CLASS,
  WORKSPACE_NAV_ITEM_CLASS,
  WORKSPACE_NAV_ITEM_IDLE_CLASS,
  WORKSPACE_NAV_NESTED_LIST_CLASS,
  WORKSPACE_NAV_PANEL_CLASS,
  WORKSPACE_NAV_SCROLL_AREA_CLASS,
  WORKSPACE_NAV_SCROLL_INNER_CLASS,
  WORKSPACE_NAV_SEARCH_WRAP_CLASS,
} from "@/lib/design/workspace-nav-tokens";
import { cn } from "@/lib/utils";

export type ResourcesSelection =
  | { type: "group"; id: string }
  | { type: "resource"; id: string }
  | null;

type ResourcesSidebarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  groups: ResourceGroup[];
  resourcesByGroup: Map<string | null, ResourceListItem[]>;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  selection: ResourcesSelection;
  onSelectGroup: (id: string) => void;
  onSelectResource: (id: string) => void;
  onAddResource: (groupId: string | null) => void;
  onCreateGroup: (name: string) => Promise<void> | void;
  createGroupPending?: boolean;
};

export function ResourcesSidebar({
  search,
  onSearchChange,
  groups,
  resourcesByGroup,
  isLoading,
  isError,
  error,
  onRetry,
  selection,
  onSelectGroup,
  onSelectResource,
  onAddResource,
  onCreateGroup,
  createGroupPending,
}: ResourcesSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const createForm = useForm<ResourceGroupNameFormValues>({
    resolver: zodResolver(resourceGroupNameSchema),
    defaultValues: resourceGroupNameDefaults,
  });

  const ungrouped = resourcesByGroup.get(null) ?? [];

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) => {
      const groupMatch = group.name.toLowerCase().includes(q);
      const inGroup = resourcesByGroup.get(group.id) ?? [];
      return (
        groupMatch ||
        inGroup.some((r) => r.name.toLowerCase().includes(q))
      );
    });
  }, [groups, resourcesByGroup, search]);

  const showUngrouped =
    ungrouped.length > 0 &&
    (!search.trim() ||
      ungrouped.some((r) =>
        r.name.toLowerCase().includes(search.trim().toLowerCase()),
      ));

  return (
    <aside
      className={cn(
        WORKSPACE_NAV_PANEL_CLASS,
        "w-[var(--workspace-nav-width)] shrink-0 border-r border-border bg-muted/20",
      )}
    >
      <div className={WORKSPACE_NAV_SEARCH_WRAP_CLASS}>
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search"
        />
        <Button
          type="button"
          variant="brand"
          className="mt-3 w-full"
          onClick={() => {
            createForm.reset(resourceGroupNameDefaults);
            setCreateOpen(true);
          }}
        >
          Add Resource Group
        </Button>
      </div>

      <ScrollArea className={WORKSPACE_NAV_SCROLL_AREA_CLASS}>
        <div className={WORKSPACE_NAV_SCROLL_INNER_CLASS}>
          {isLoading ? (
            <LoadingState variant="inline" className="p-2" />
          ) : isError ? (
            <ApiErrorState
              compact
              className="m-2"
              error={error}
              title="Could not load resources"
              onRetry={onRetry}
            />
          ) : filteredGroups.length === 0 && !showUngrouped ? (
            <p className="p-2 text-sm text-muted-foreground">
              No resource groups yet. Add one to get started.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredGroups.map((group) => (
                <GroupBlock
                  key={group.id}
                  group={group}
                  resources={resourcesByGroup.get(group.id) ?? []}
                  selection={selection}
                  onSelectGroup={onSelectGroup}
                  onSelectResource={onSelectResource}
                  onAddResource={() => onAddResource(group.id)}
                />
              ))}
              {showUngrouped ? (
                <div className="flex flex-col gap-1">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ungrouped
                  </p>
                  <ul className={WORKSPACE_NAV_NESTED_LIST_CLASS}>
                    {ungrouped.map((resource) => (
                      <li key={resource.id}>
                        <ResourceNavButton
                          resource={resource}
                          active={
                            selection?.type === "resource" &&
                            selection.id === resource.id
                          }
                          onSelect={() => onSelectResource(resource.id)}
                        />
                      </li>
                    ))}
                  </ul>
                  <DrawerAddAction
                    label="Add Resource"
                    onClick={() => onAddResource(null)}
                    className="mt-1"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </ScrollArea>

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add Resource Group"
        form={createForm}
        schema={resourceGroupNameSchema}
        isPending={createGroupPending}
        submitLabel="Add"
        onSubmit={async (values) => {
          await onCreateGroup(values.name.trim());
          setCreateOpen(false);
          createForm.reset(resourceGroupNameDefaults);
        }}
      >
        <TextField
          control={createForm.control}
          name="name"
          label="Group Name"
          placeholder="Enter group name"
        />
      </FormDialog>
    </aside>
  );
}

function GroupBlock({
  group,
  resources,
  selection,
  onSelectGroup,
  onSelectResource,
  onAddResource,
}: {
  group: ResourceGroup;
  resources: ResourceListItem[];
  selection: ResourcesSelection;
  onSelectGroup: (id: string) => void;
  onSelectResource: (id: string) => void;
  onAddResource: () => void;
}) {
  const groupActive =
    selection?.type === "group" && selection.id === group.id;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={cn(
          WORKSPACE_NAV_ITEM_CLASS,
          groupActive
            ? WORKSPACE_NAV_ITEM_ACTIVE_CLASS
            : WORKSPACE_NAV_ITEM_IDLE_CLASS,
          "font-semibold",
        )}
        onClick={() => onSelectGroup(group.id)}
      >
        <span className="truncate">{group.name}</span>
      </button>
      <ul className={WORKSPACE_NAV_NESTED_LIST_CLASS}>
        {resources.map((resource) => (
          <li key={resource.id}>
            <ResourceNavButton
              resource={resource}
              active={
                selection?.type === "resource" && selection.id === resource.id
              }
              onSelect={() => onSelectResource(resource.id)}
              nested
            />
          </li>
        ))}
      </ul>
      <DrawerAddAction
        label="Add Resource"
        onClick={onAddResource}
        className="mt-1"
      />
    </div>
  );
}

function ResourceNavButton({
  resource,
  active,
  onSelect,
  nested = false,
}: {
  resource: ResourceListItem;
  active: boolean;
  onSelect: () => void;
  nested?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        WORKSPACE_NAV_ITEM_CLASS,
        active
          ? WORKSPACE_NAV_ITEM_ACTIVE_CLASS
          : WORKSPACE_NAV_ITEM_IDLE_CLASS,
        nested && "pl-6",
      )}
      onClick={onSelect}
    >
      <span className="truncate">{resource.name}</span>
      {resource.status === "INACTIVE" ? (
        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
          Inactive
        </Badge>
      ) : null}
    </button>
  );
}
