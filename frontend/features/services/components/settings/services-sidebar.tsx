"use client";

import { useMemo, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ServiceTreeCategory } from "@/features/services/api/service-workspace.api";
import {
  categoryNameDefaults,
  categoryNameSchema,
  type CategoryNameFormValues,
} from "@/features/services/schemas/category-name";
import type { ServicesSelection } from "@/features/services/types/selection";
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

type ServicesSidebarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filteredCategories: ServiceTreeCategory[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  selection: ServicesSelection;
  onSelectCategory: (id: string) => void;
  onSelectService: (id: string) => void;
  onAddService: (categoryId: string) => void;
  onCreateCategory: (name: string) => Promise<void> | void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories: (orderedIds: string[]) => void;
  onReorderServices: (categoryId: string, orderedIds: string[]) => void;
  createCategoryPending?: boolean;
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

export function ServicesSidebar({
  search,
  onSearchChange,
  filteredCategories,
  isLoading,
  isRefetching,
  isError,
  error,
  onRetry,
  selection,
  onSelectCategory,
  onSelectService,
  onAddService,
  onCreateCategory,
  onDeleteCategory,
  onReorderCategories,
  onReorderServices,
  createCategoryPending,
}: ServicesSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const createForm = useForm<CategoryNameFormValues>({
    resolver: zodResolver(categoryNameSchema),
    defaultValues: categoryNameDefaults,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const categoryIds = useMemo(
    () => filteredCategories.map((c) => c.id),
    [filteredCategories],
  );

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (search.trim()) {
      toast.error("Clear search to reorder categories");
      return;
    }
    const oldIndex = categoryIds.indexOf(String(active.id));
    const newIndex = categoryIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderCategories(arrayMove(categoryIds, oldIndex, newIndex));
  };

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
            createForm.reset(categoryNameDefaults);
            setCreateOpen(true);
          }}
        >
          Add Category
        </Button>
      </div>

      <ScrollArea className={WORKSPACE_NAV_SCROLL_AREA_CLASS}>
        <div className={WORKSPACE_NAV_SCROLL_INNER_CLASS}>
          {isLoading || isRefetching ? (
            <LoadingState variant="inline" className="p-2" />
          ) : isError ? (
            <ApiErrorState
              compact
              className="m-2"
              error={error}
              title="Could not load services"
              onRetry={onRetry}
            />
          ) : filteredCategories.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">
              No categories yet. Add one to get started.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCategoryDragEnd}
            >
              <SortableContext
                items={categoryIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {filteredCategories.map((category) => (
                    <CategoryBlock
                      key={category.id}
                      category={category}
                      selection={selection}
                      searchActive={Boolean(search.trim())}
                      sensors={sensors}
                      onSelectCategory={onSelectCategory}
                      onSelectService={onSelectService}
                      onAddService={onAddService}
                      onDeleteCategory={onDeleteCategory}
                      onReorderServices={onReorderServices}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </ScrollArea>

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add Category"
        form={createForm}
        schema={categoryNameSchema}
        isPending={createCategoryPending}
        submitLabel="Create"
        onSubmit={async (values) => {
          await onCreateCategory(values.name.trim());
          setCreateOpen(false);
          createForm.reset(categoryNameDefaults);
        }}
      >
        <TextField
          control={createForm.control}
          name="name"
          label="Category Name"
          placeholder="Enter category name"
        />
      </FormDialog>
    </aside>
  );
}

function CategoryBlock({
  category,
  selection,
  searchActive,
  sensors,
  onSelectCategory,
  onSelectService,
  onAddService,
  onDeleteCategory,
  onReorderServices,
}: {
  category: ServiceTreeCategory;
  selection: ServicesSelection;
  searchActive: boolean;
  sensors: ReturnType<typeof useSensors>;
  onSelectCategory: (id: string) => void;
  onSelectService: (id: string) => void;
  onAddService: (categoryId: string) => void;
  onDeleteCategory: (id: string) => void;
  onReorderServices: (categoryId: string, orderedIds: string[]) => void;
}) {
  const serviceIds = category.services.map((s) => s.id);
  const categoryActive =
    selection?.type === "category" && selection.id === category.id;

  const handleServiceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (searchActive) {
      toast.error("Clear search to reorder services");
      return;
    }
    const oldIndex = serviceIds.indexOf(String(active.id));
    const newIndex = serviceIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderServices(category.id, arrayMove(serviceIds, oldIndex, newIndex));
  };

  return (
    <div className="space-y-1">
      <SortableRow id={category.id} disabled={searchActive}>
        {({ attributes, listeners }) => (
          <div
            className={cn(
              WORKSPACE_NAV_ITEM_CLASS,
              categoryActive
                ? WORKSPACE_NAV_ITEM_ACTIVE_CLASS
                : WORKSPACE_NAV_ITEM_IDLE_CLASS,
            )}
          >
            <button
              type="button"
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
              disabled={searchActive}
              aria-label={`Reorder ${category.name}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left font-medium"
              onClick={() => onSelectCategory(category.id)}
            >
              {category.name}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <MoreActionsButton
                    size="icon-sm"
                    aria-label={`${category.name} actions`}
                  />
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onSelectCategory(category.id)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDeleteCategory(category.id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </SortableRow>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleServiceDragEnd}
      >
        <SortableContext
          items={serviceIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className={cn(WORKSPACE_NAV_NESTED_LIST_CLASS, "pl-4")}>
            {category.services.map((service) => {
              const active =
                selection?.type === "service" && selection.id === service.id;
              return (
                <SortableRow
                  key={service.id}
                  id={service.id}
                  disabled={searchActive}
                >
                  {({ attributes: svcAttrs, listeners: svcListeners }) => (
                    <li>
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
                          aria-label={`Reorder ${service.name}`}
                          {...svcAttrs}
                          {...svcListeners}
                        >
                          <GripVertical className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center justify-between gap-2 truncate text-left"
                          onClick={() => onSelectService(service.id)}
                        >
                          <span className="truncate">{service.name}</span>
                          {service.isDemo ? (
                            <Badge
                              variant="secondary"
                              className="shrink-0 text-[10px]"
                            >
                              Demo
                            </Badge>
                          ) : null}
                        </button>
                      </div>
                    </li>
                  )}
                </SortableRow>
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="pl-4 pt-1">
        <DrawerAddAction
          label="Add Service"
          onClick={() => onAddService(category.id)}
        />
      </div>
    </div>
  );
}
