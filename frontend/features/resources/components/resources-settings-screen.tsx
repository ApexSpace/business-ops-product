"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ResourceWorkspacePanel } from "@/features/resources/components/resource-workspace-panel";
import { useResourceGroups } from "@/features/resources/hooks/use-resource-groups";
import { useResourcesList } from "@/features/resources/hooks/use-resources-list";
import { useResourceMutations } from "@/features/resources/hooks/use-resource-mutations";
import type {
  ResourceListItem,
  ServiceResourceType,
} from "@/features/resources/types";
import { resourceTypeLabel } from "@/features/resources/utils/resource-schedule.util";

const RESOURCE_TYPES: ServiceResourceType[] = [
  "ROOM",
  "EQUIPMENT",
  "CONSUMABLE",
];

export function ResourcesSettingsScreen() {
  const [search, setSearch] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null,
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [createGroupId, setCreateGroupId] = useState<string | null | "ungrouped">(
    null,
  );
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceType, setNewResourceType] =
    useState<ServiceResourceType>("ROOM");

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

  const groupedResources = useMemo(() => {
    const items = resources ?? [];
    const byGroup = new Map<string | null, ResourceListItem[]>();
    for (const resource of items) {
      const key = resource.groupId;
      const list = byGroup.get(key) ?? [];
      list.push(resource);
      byGroup.set(key, list);
    }
    for (const list of byGroup.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }
    return byGroup;
  }, [resources]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const allGroups = groups ?? [];
    if (!q) return allGroups;
    return allGroups.filter((group) => {
      const groupMatch = group.name.toLowerCase().includes(q);
      const resourcesInGroup = groupedResources.get(group.id) ?? [];
      return groupMatch || resourcesInGroup.length > 0;
    });
  }, [groups, groupedResources, search]);

  const ungrouped = groupedResources.get(null) ?? [];
  const isLoading = groupsLoading || resourcesLoading;
  const isError = groupsError || resourcesError;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] w-full gap-0 overflow-hidden rounded-lg border bg-card">
      <aside className="flex w-72 shrink-0 flex-col border-r bg-muted/20">
        <div className="space-y-2 border-b p-3">
          <Button
            className="w-full"
            size="sm"
            onClick={() => {
              const name = newGroupName.trim();
              if (!name) {
                toast.error("Enter a group name below first");
                return;
              }
              mutations.createGroup.mutate(name, {
                onSuccess: () => setNewGroupName(""),
              });
            }}
            disabled={mutations.createGroup.isPending}
          >
            <Plus className="mr-2 size-4" />
            Add group
          </Button>
          <div className="space-y-1.5">
            <Label htmlFor="new-resource-group-name" className="text-xs">
              Group name
            </Label>
            <Input
              id="new-resource-group-name"
              placeholder="e.g. Treatment rooms"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search resources…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <LoadingState variant="inline" className="p-2" />
          ) : isError ? (
            <ApiErrorState
              compact
              className="m-2"
              error={groupsError ? groupsErr : resourcesErr}
              title="Could not load resources"
              onRetry={() => {
                void refetchGroups();
                void refetchResources();
              }}
            />
          ) : (
            <>
              {filteredGroups.map((group) => (
                <ResourceGroupSection
                  key={group.id}
                  title={group.name}
                  resources={groupedResources.get(group.id) ?? []}
                  selectedResourceId={selectedResourceId}
                  onSelect={(id) => {
                    setSelectedResourceId(id);
                    setCreateGroupId(null);
                  }}
                  onAddResource={() => {
                    setCreateGroupId(group.id);
                    setSelectedResourceId(null);
                  }}
                />
              ))}
              <ResourceGroupSection
                title="Ungrouped"
                resources={ungrouped}
                selectedResourceId={selectedResourceId}
                onSelect={(id) => {
                  setSelectedResourceId(id);
                  setCreateGroupId(null);
                }}
                onAddResource={() => {
                  setCreateGroupId("ungrouped");
                  setSelectedResourceId(null);
                }}
              />
            </>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {createGroupId != null ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            <div>
              <h2 className="text-lg font-semibold">New resource</h2>
              <p className="text-sm text-muted-foreground">
                Add a room, equipment, or consumable to your catalog.
              </p>
            </div>
            <div className="grid max-w-md gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-resource-name">Name</Label>
                <Input
                  id="new-resource-name"
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                  placeholder="e.g. Room 1"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={newResourceType}
                  onValueChange={(v) =>
                    setNewResourceType(v as ServiceResourceType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {resourceTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const name = newResourceName.trim();
                  if (!name) {
                    toast.error("Enter a resource name");
                    return;
                  }
                  mutations.create.mutate(
                    {
                      name,
                      resourceType: newResourceType,
                      groupId:
                        createGroupId === "ungrouped" ? null : createGroupId,
                    },
                    {
                      onSuccess: (resource) => {
                        setCreateGroupId(null);
                        setNewResourceName("");
                        setSelectedResourceId(resource.id);
                      },
                    },
                  );
                }}
                disabled={mutations.create.isPending}
              >
                Create resource
              </Button>
              <Button
                variant="outline"
                onClick={() => setCreateGroupId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : selectedResourceId ? (
          <ResourceWorkspacePanel resourceId={selectedResourceId} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
            <Warehouse className="size-10 opacity-40" />
            <p className="text-sm">
              Select a resource on the left or add a new one to configure details,
              schedule, and linked services.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function ResourceGroupSection({
  title,
  resources,
  selectedResourceId,
  onSelect,
  onAddResource,
}: {
  title: string;
  resources: ResourceListItem[];
  selectedResourceId: string | null;
  onSelect: (id: string) => void;
  onAddResource: () => void;
}) {
  if (resources.length === 0 && title !== "Ungrouped") {
    return (
      <div className="mb-4">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start text-primary"
          onClick={onAddResource}
        >
          <Plus className="mr-1 size-3" />
          Add resource
        </Button>
      </div>
    );
  }

  if (resources.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-0.5">
        {resources.map((resource) => (
          <li key={resource.id}>
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                selectedResourceId === resource.id && "bg-muted",
              )}
              onClick={() => onSelect(resource.id)}
            >
              <span className="truncate">{resource.name}</span>
              {resource.status === "INACTIVE" ? (
                <Badge variant="secondary" className="ml-1 shrink-0 text-[10px]">
                  Inactive
                </Badge>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        className="mt-1 w-full justify-start text-primary"
        onClick={onAddResource}
      >
        <Plus className="mr-1 size-3" />
        Add resource
      </Button>
    </div>
  );
}
