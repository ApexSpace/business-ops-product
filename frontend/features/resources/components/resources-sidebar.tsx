"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
  WORKSPACE_NAV_ASIDE_CLASS,
  WORKSPACE_NAV_ASIDE_MOBILE_FULL_CLASS,
  WORKSPACE_NAV_PRIMARY_ADD_CLASS,
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
  /** Full-bleed aside when list is the only mobile pane. */
  fullWidth?: boolean;
  onSelectGroup: (id: string) => void;
  onSelectResource: (id: string) => void;
  onAddResource: (groupId: string | null) => void;
  onCreateGroup: (name: string) => Promise<void> | void;
  onReorderGroups: (orderedIds: string[]) => void;
  onReorderResources: (groupId: string | null, orderedIds: string[]) => void;
  createGroupPending?: boolean;
};

function SortableRow({
  id,
  disabled,
  className,
  children,
}: {
  id: string;
  disabled?: boolean;
  className?: string;
  children: (handleProps: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown> | undefined;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "z-10 opacity-80", className)}
    >
      {children({
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: listeners as Record<string, unknown> | undefined,
      })}
    </div>
  );
}

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
  fullWidth = false,
  onSelectGroup,
  onSelectResource,
  onAddResource,
  onCreateGroup,
  onReorderGroups,
  onReorderResources,
  createGroupPending,
}: ResourcesSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const createForm = useForm<ResourceGroupNameFormValues>({
    resolver: zodResolver(resourceGroupNameSchema),
    defaultValues: resourceGroupNameDefaults,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ungrouped = resourcesByGroup.get(null) ?? [];
  const searchActive = Boolean(search.trim());
  const searchQuery = search.trim().toLowerCase();

  const filteredGroups = !searchQuery
    ? groups
    : groups.filter((group) => {
        const groupMatch = group.name.toLowerCase().includes(searchQuery);
        const inGroup = resourcesByGroup.get(group.id) ?? [];
        return (
          groupMatch ||
          inGroup.some((r) => r.name.toLowerCase().includes(searchQuery))
        );
      });

  const groupIds = filteredGroups.map((g) => g.id);

  const showUngrouped =
    ungrouped.length > 0 &&
    (!searchQuery ||
      ungrouped.some((r) => r.name.toLowerCase().includes(searchQuery)));

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (searchActive) {
      toast.error("Clear search to reorder groups");
      return;
    }
    const oldIndex = groupIds.indexOf(String(active.id));
    const newIndex = groupIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderGroups(arrayMove(groupIds, oldIndex, newIndex));
  };

  return (
    <aside
      className={
        fullWidth
          ? WORKSPACE_NAV_ASIDE_MOBILE_FULL_CLASS
          : WORKSPACE_NAV_ASIDE_CLASS
      }
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
          className={WORKSPACE_NAV_PRIMARY_ADD_CLASS}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleGroupDragEnd}
            >
              <SortableContext
                items={groupIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {filteredGroups.map((group) => (
                    <GroupBlock
                      key={group.id}
                      group={group}
                      resources={resourcesByGroup.get(group.id) ?? []}
                      selection={selection}
                      searchActive={searchActive}
                      sensors={sensors}
                      onSelectGroup={onSelectGroup}
                      onSelectResource={onSelectResource}
                      onAddResource={() => onAddResource(group.id)}
                      onReorderResources={(orderedIds) =>
                        onReorderResources(group.id, orderedIds)
                      }
                    />
                  ))}
                  {showUngrouped ? (
                    <UngroupedBlock
                      resources={ungrouped}
                      selection={selection}
                      searchActive={searchActive}
                      sensors={sensors}
                      onSelectResource={onSelectResource}
                      onAddResource={() => onAddResource(null)}
                      onReorderResources={(orderedIds) =>
                        onReorderResources(null, orderedIds)
                      }
                    />
                  ) : null}
                </div>
              </SortableContext>
            </DndContext>
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
  searchActive,
  sensors,
  onSelectGroup,
  onSelectResource,
  onAddResource,
  onReorderResources,
}: {
  group: ResourceGroup;
  resources: ResourceListItem[];
  selection: ResourcesSelection;
  searchActive: boolean;
  sensors: ReturnType<typeof useSensors>;
  onSelectGroup: (id: string) => void;
  onSelectResource: (id: string) => void;
  onAddResource: () => void;
  onReorderResources: (orderedIds: string[]) => void;
}) {
  const resourceIds = resources.map((r) => r.id);
  const groupActive =
    selection?.type === "group" && selection.id === group.id;

  const handleResourceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (searchActive) {
      toast.error("Clear search to reorder resources");
      return;
    }
    const oldIndex = resourceIds.indexOf(String(active.id));
    const newIndex = resourceIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderResources(arrayMove(resourceIds, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-col gap-1">
      <SortableRow id={group.id} disabled={searchActive}>
        {({ attributes, listeners }) => (
          <div
            className={cn(
              WORKSPACE_NAV_ITEM_CLASS,
              groupActive
                ? WORKSPACE_NAV_ITEM_ACTIVE_CLASS
                : WORKSPACE_NAV_ITEM_IDLE_CLASS,
              "font-semibold",
            )}
          >
            <button
              type="button"
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
              disabled={searchActive}
              aria-label={`Reorder ${group.name}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left"
              onClick={() => onSelectGroup(group.id)}
            >
              {group.name}
            </button>
          </div>
        )}
      </SortableRow>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleResourceDragEnd}
      >
        <SortableContext
          items={resourceIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className={cn(WORKSPACE_NAV_NESTED_LIST_CLASS, "pl-4")}>
            {resources.map((resource) => (
              <SortableRow
                key={resource.id}
                id={resource.id}
                disabled={searchActive}
              >
                {({ attributes, listeners }) => (
                  <li>
                    <ResourceNavRow
                      resource={resource}
                      active={
                        selection?.type === "resource" &&
                        selection.id === resource.id
                      }
                      searchActive={searchActive}
                      onSelect={() => onSelectResource(resource.id)}
                      dragAttributes={attributes}
                      dragListeners={listeners}
                    />
                  </li>
                )}
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="pl-4 pt-1">
        <DrawerAddAction label="Add Resource" onClick={onAddResource} />
      </div>
    </div>
  );
}

function UngroupedBlock({
  resources,
  selection,
  searchActive,
  sensors,
  onSelectResource,
  onAddResource,
  onReorderResources,
}: {
  resources: ResourceListItem[];
  selection: ResourcesSelection;
  searchActive: boolean;
  sensors: ReturnType<typeof useSensors>;
  onSelectResource: (id: string) => void;
  onAddResource: () => void;
  onReorderResources: (orderedIds: string[]) => void;
}) {
  const resourceIds = resources.map((r) => r.id);

  const handleResourceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (searchActive) {
      toast.error("Clear search to reorder resources");
      return;
    }
    const oldIndex = resourceIds.indexOf(String(active.id));
    const newIndex = resourceIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderResources(arrayMove(resourceIds, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Ungrouped
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleResourceDragEnd}
      >
        <SortableContext
          items={resourceIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className={WORKSPACE_NAV_NESTED_LIST_CLASS}>
            {resources.map((resource) => (
              <SortableRow
                key={resource.id}
                id={resource.id}
                disabled={searchActive}
              >
                {({ attributes, listeners }) => (
                  <li>
                    <ResourceNavRow
                      resource={resource}
                      active={
                        selection?.type === "resource" &&
                        selection.id === resource.id
                      }
                      searchActive={searchActive}
                      onSelect={() => onSelectResource(resource.id)}
                      dragAttributes={attributes}
                      dragListeners={listeners}
                    />
                  </li>
                )}
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <DrawerAddAction
        label="Add Resource"
        onClick={onAddResource}
        className="mt-1"
      />
    </div>
  );
}

function ResourceNavRow({
  resource,
  active,
  searchActive,
  onSelect,
  dragAttributes,
  dragListeners,
}: {
  resource: ResourceListItem;
  active: boolean;
  searchActive: boolean;
  onSelect: () => void;
  dragAttributes: Record<string, unknown>;
  dragListeners: Record<string, unknown> | undefined;
}) {
  return (
    <div
      className={cn(
        WORKSPACE_NAV_ITEM_CLASS,
        active
          ? WORKSPACE_NAV_ITEM_ACTIVE_CLASS
          : WORKSPACE_NAV_ITEM_IDLE_CLASS,
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
        disabled={searchActive}
        aria-label={`Reorder ${resource.name}`}
        {...dragAttributes}
        {...dragListeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 truncate text-left"
        onClick={onSelect}
      >
        <span className="truncate">{resource.name}</span>
        {resource.status === "INACTIVE" ? (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            Inactive
          </Badge>
        ) : null}
      </button>
    </div>
  );
}
