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
import { FormDialog } from "@/components/forms/form-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { TextField } from "@/components/forms/text-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Offer } from "@/features/offers/types";
import {
  offerCreateDefaults,
  offerCreateSchema,
  type OfferCreateFormValues,
} from "@/features/offers/schemas/offer-create";
import {
  WORKSPACE_NAV_ITEM_ACTIVE_CLASS,
  WORKSPACE_NAV_ITEM_CLASS,
  WORKSPACE_NAV_ITEM_IDLE_CLASS,
  WORKSPACE_NAV_ASIDE_CLASS,
  WORKSPACE_NAV_PRIMARY_ADD_CLASS,
  WORKSPACE_NAV_SCROLL_AREA_CLASS,
  WORKSPACE_NAV_SCROLL_INNER_CLASS,
  WORKSPACE_NAV_SEARCH_WRAP_CLASS,
} from "@/lib/design/workspace-nav-tokens";
import { cn } from "@/lib/utils";

type OffersSidebarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  offers: Offer[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (values: OfferCreateFormValues) => Promise<void> | void;
  onReorder: (orderedIds: string[]) => void;
  canManage?: boolean;
  createPending?: boolean;
};

function SortableOfferRow({
  offer,
  active,
  disabled,
  onSelect,
}: {
  offer: Offer;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: offer.id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "z-10 opacity-80")}
    >
      <button
        type="button"
        className={cn(
          WORKSPACE_NAV_ITEM_CLASS,
          "w-full",
          active
            ? WORKSPACE_NAV_ITEM_ACTIVE_CLASS
            : WORKSPACE_NAV_ITEM_IDLE_CLASS,
        )}
        onClick={onSelect}
      >
        {!disabled ? (
          <span
            className="inline-flex shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" aria-hidden />
          </span>
        ) : null}
        <span className="min-w-0 truncate">{offer.name}</span>
        {!offer.isEnabled ? (
          <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
            Disabled
          </Badge>
        ) : null}
      </button>
    </div>
  );
}

export function OffersSidebar({
  search,
  onSearchChange,
  offers,
  isLoading,
  isError,
  error,
  onRetry,
  selectedId,
  onSelect,
  onCreate,
  onReorder,
  canManage = true,
  createPending,
}: OffersSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const createForm = useForm<OfferCreateFormValues>({
    resolver: zodResolver(offerCreateSchema),
    defaultValues: offerCreateDefaults,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const offerIds = useMemo(() => offers.map((o) => o.id), [offers]);
  const searchActive = Boolean(search.trim());

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (searchActive) {
      toast.error("Clear search to reorder offers");
      return;
    }
    const oldIndex = offerIds.indexOf(String(active.id));
    const newIndex = offerIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(offerIds, oldIndex, newIndex));
  };

  return (
    <aside className={WORKSPACE_NAV_ASIDE_CLASS}>
      <div className={WORKSPACE_NAV_SEARCH_WRAP_CLASS}>
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search"
        />
        {canManage ? (
          <Button
            type="button"
            variant="brand"
            className={WORKSPACE_NAV_PRIMARY_ADD_CLASS}
            onClick={() => {
              createForm.reset(offerCreateDefaults);
              setCreateOpen(true);
            }}
          >
            Create Offer
          </Button>
        ) : null}
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
              title="Could not load offers"
              onRetry={onRetry}
            />
          ) : offers.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">
              No offers yet. Create one to get started.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={offerIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-1">
                  {offers.map((offer) => (
                    <SortableOfferRow
                      key={offer.id}
                      offer={offer}
                      active={selectedId === offer.id}
                      disabled={!canManage || searchActive}
                      onSelect={() => onSelect(offer.id)}
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
        title="Create Offer"
        form={createForm}
        schema={offerCreateSchema}
        isPending={createPending}
        submitLabel="Create"
        onSubmit={async (values) => {
          await onCreate(values);
          setCreateOpen(false);
          createForm.reset(offerCreateDefaults);
        }}
      >
        <div className="space-y-4">
          <TextField
            control={createForm.control}
            name="name"
            label="Name"
            placeholder="Enter name"
          />
          <TextField
            control={createForm.control}
            name="description"
            label="Description"
            placeholder="Enter description"
            multiline
            rows={3}
          />
        </div>
      </FormDialog>
    </aside>
  );
}
