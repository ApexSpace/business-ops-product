"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateWorkItem } from "@/features/work-items/api/work-items.api";
import { WorkItemBoardCard } from "@/features/work-items/components/work-item-board-card";
import { WorkItemBoardColumn } from "@/features/work-items/components/work-item-board-column";
import { groupWorkItemsByStatus } from "@/features/work-items/components/work-item-board-utils";
import { getWorkItemStatusAccent } from "@/features/work-items/utils/work-item-status-colors";
import { useWorkItemsHost } from "@/features/work-items/work-items-host-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  invalidateBusinessDashboardStats,
  invalidateWorkItemLists,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import {
  formatWorkItemStatus,
  WORK_ITEM_STATUS_OPTIONS,
} from "@/features/work-items/schemas/work-item-profile";
import type { PaginatedResult, WorkItem, WorkItemStatus } from "@/features/work-items/types";

export interface WorkItemBoardProps {
  items: WorkItem[];
  isLoading: boolean;
  statusFilter?: WorkItemStatus | "";
  listQueryKey: ReturnType<typeof queryKeys.workItems.list>;
  truncatedTotal?: number;
  countSingular?: string;
  countPlural?: string;
  canManage?: boolean;
  onEdit?: (item: WorkItem) => void;
  onDelete?: (item: WorkItem) => void;
  onAddItem?: (status: WorkItemStatus) => void;
}

export function WorkItemBoard({
  items: itemsProp,
  isLoading,
  statusFilter = "",
  listQueryKey,
  truncatedTotal,
  countSingular = "item",
  countPlural = "items",
  canManage = true,
  onEdit,
  onDelete,
  onAddItem,
}: WorkItemBoardProps) {
  const queryClient = useQueryClient();
  const { apiBase, mode } = useWorkItemsHost();
  const columns = useMemo(
    () =>
      statusFilter
        ? WORK_ITEM_STATUS_OPTIONS.filter((o) => o.value === statusFilter)
        : WORK_ITEM_STATUS_OPTIONS,
    [statusFilter],
  );

  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, WorkItemStatus>
  >({});
  const [activeItem, setActiveItem] = useState<WorkItem | null>(null);
  const [overStatus, setOverStatus] = useState<WorkItemStatus | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<
    Partial<Record<WorkItemStatus, boolean>>
  >({});

  const boardItems = useMemo(() => {
    const withOverrides = itemsProp.map((item) => {
      const override = statusOverrides[item.id];
      return override ? { ...item, status: override } : item;
    });
    if (!statusFilter) return withOverrides;
    return withOverrides.filter((item) => item.status === statusFilter);
  }, [itemsProp, statusOverrides, statusFilter]);

  const itemsByStatus = useMemo(
    () => groupWorkItemsByStatus(boardItems),
    [boardItems],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const applyStatusOverride = useCallback(
    (itemId: string, newStatus: WorkItemStatus) => {
      setStatusOverrides((prev) => ({ ...prev, [itemId]: newStatus }));
    },
    [],
  );

  const statusMutation = useMutation({
    mutationFn: ({
      itemId,
      status,
    }: {
      itemId: string;
      status: WorkItemStatus;
    }) => updateWorkItem(itemId, { status }, apiBase),
    onSuccess: (updated, { status }) => {
      queryClient.setQueryData<PaginatedResult<WorkItem>>(
        listQueryKey,
        (old) => {
          if (!old) return old;
          if (statusFilter && updated.status !== statusFilter) {
            return {
              ...old,
              items: old.items.filter((i) => i.id !== updated.id),
              meta: {
                ...old.meta,
                total: Math.max(0, old.meta.total - 1),
              },
            };
          }
          return {
            ...old,
            items: old.items.map((i) =>
              i.id === updated.id ? updated : i,
            ),
          };
        },
      );
      void invalidateWorkItemLists(queryClient, apiBase);
      if (mode === "business") {
        void invalidateBusinessDashboardStats(queryClient);
      }
      toast.success(`Moved to ${formatWorkItemStatus(status)}`);
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[updated.id];
        return next;
      });
      setMovingId(null);
    },
    onError: (err: Error) => {
      setStatusOverrides({});
      setMovingId(null);
      toast.error(err.message);
    },
  });

  const moveItem = useCallback(
    (item: WorkItem, newStatus: WorkItemStatus) => {
      if (!onEdit || item.status === newStatus) return;

      setMovingId(item.id);
      applyStatusOverride(item.id, newStatus);

      statusMutation.mutate(
        { itemId: item.id, status: newStatus },
        {
          onError: () => {
            setStatusOverrides((prev) => {
              const next = { ...prev };
              delete next[item.id];
              return next;
            });
          },
        },
      );
    },
    [applyStatusOverride, onEdit, statusMutation],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const item = boardItems.find((i) => i.id === event.active.id);
    setActiveItem(item ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id;
    if (
      typeof overId === "string" &&
      WORK_ITEM_STATUS_OPTIONS.some((o) => o.value === overId)
    ) {
      setOverStatus(overId as WorkItemStatus);
      return;
    }
    if (overId) {
      const overItem = boardItems.find((i) => i.id === overId);
      if (overItem) {
        setOverStatus(overItem.status);
        return;
      }
    }
    setOverStatus(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    setOverStatus(null);

    const { active, over } = event;
    if (!over) return;

    const itemId = String(active.id);
    const item = boardItems.find((i) => i.id === itemId);
    if (!item) return;

    let targetStatus = String(over.id) as WorkItemStatus;
    if (!WORK_ITEM_STATUS_OPTIONS.some((o) => o.value === targetStatus)) {
      const overItem = boardItems.find((i) => i.id === targetStatus);
      if (!overItem) return;
      targetStatus = overItem.status;
    }

    moveItem(item, targetStatus);
  };

  const handleDragCancel = () => {
    setActiveItem(null);
    setOverStatus(null);
  };

  const toggleColumn = (status: WorkItemStatus) => {
    setCollapsedColumns((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const activeAccent = activeItem
    ? getWorkItemStatusAccent(activeItem.status)
    : null;

  if (isLoading) {
    return (
      <div className="scrollbar-thin flex min-h-0 gap-4 overflow-x-auto overflow-y-hidden pb-2">
        {columns.map((col) => (
          <Skeleton
            key={col.value}
            className="h-[420px] w-[312px] shrink-0 rounded-2xl"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {truncatedTotal !== undefined && truncatedTotal > boardItems.length ? (
        <p className="text-xs text-muted-foreground">
          Showing {boardItems.length} of {truncatedTotal} {countPlural}. Switch
          to table view to see more.
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="scrollbar-thin flex min-h-[calc(100vh-14rem)] items-start gap-[18px] overflow-x-auto overflow-y-hidden pb-3">
          {columns.map((column) => (
            <WorkItemBoardColumn
              key={column.value}
              column={column}
              columnItems={itemsByStatus.get(column.value) ?? []}
              accent={getWorkItemStatusAccent(column.value)}
              countSingular={countSingular}
              countPlural={countPlural}
              overStatus={overStatus}
              activeItem={activeItem}
              movingId={movingId}
              collapsed={collapsedColumns[column.value]}
              onToggleCollapse={() => toggleColumn(column.value)}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddItem={onAddItem}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
          {activeItem && activeAccent ? (
            <WorkItemBoardCard
              item={activeItem}
              accentColor={activeAccent.accentColor}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
