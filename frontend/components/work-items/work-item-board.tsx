"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  BoardColumn,
  BoardScrollArea,
  parseBoardAmount,
} from "@/components/board";
import { WorkItemBoardCard } from "@/components/work-items/work-item-board-card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import {
  invalidateBusinessDashboardStats,
  invalidateWorkItemLists,
} from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";
import {
  formatWorkItemStatus,
  WORK_ITEM_STATUS_OPTIONS,
} from "@/lib/work-item-profile";
import type { PaginatedResult, WorkItem, WorkItemStatus } from "@/types/api";

function groupItemsByStatus(
  items: WorkItem[],
): Map<WorkItemStatus, WorkItem[]> {
  const map = new Map<WorkItemStatus, WorkItem[]>();
  for (const option of WORK_ITEM_STATUS_OPTIONS) {
    map.set(option.value, []);
  }
  for (const item of items) {
    const list = map.get(item.status);
    if (list) list.push(item);
    else map.set(item.status, [item]);
  }
  return map;
}

function sumWorkItemColumnAmount(items: WorkItem[]): number {
  return items.reduce((sum, item) => sum + parseBoardAmount(item.amount), 0);
}

export interface WorkItemBoardProps {
  items: WorkItem[];
  isLoading: boolean;
  statusFilter?: WorkItemStatus | "";
  listQueryKey: ReturnType<typeof queryKeys.workItems.list>;
  truncatedTotal?: number;
  countSingular?: string;
  countPlural?: string;
  onEdit: (item: WorkItem) => void;
  onDelete: (id: string) => void;
}

export function WorkItemBoard({
  items: itemsProp,
  isLoading,
  statusFilter = "",
  listQueryKey,
  truncatedTotal,
  countSingular = "Item",
  countPlural,
  onEdit,
  onDelete,
}: WorkItemBoardProps) {
  const queryClient = useQueryClient();
  const columns = useMemo(
    () =>
      statusFilter
        ? WORK_ITEM_STATUS_OPTIONS.filter((o) => o.value === statusFilter)
        : WORK_ITEM_STATUS_OPTIONS,
    [statusFilter],
  );

  const [boardItems, setBoardItems] = useState(itemsProp);
  const [activeItem, setActiveItem] = useState<WorkItem | null>(null);
  const [overStatus, setOverStatus] = useState<WorkItemStatus | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<
    Partial<Record<WorkItemStatus, boolean>>
  >({});

  useEffect(() => {
    setBoardItems(itemsProp);
  }, [itemsProp]);

  const itemsByStatus = useMemo(
    () => groupItemsByStatus(boardItems),
    [boardItems],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const applyStatusChange = useCallback(
    (itemId: string, newStatus: WorkItemStatus) => {
      setBoardItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item,
        ),
      );
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
    }) =>
      apiClient<WorkItem>(`work-items/${itemId}`, {
        method: "PATCH",
        body: { status },
      }),
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
      void invalidateWorkItemLists(queryClient);
      void invalidateBusinessDashboardStats(queryClient);
      toast.success(`Moved to ${formatWorkItemStatus(status)}`);
      setMovingId(null);
    },
    onError: (err: Error) => {
      setBoardItems(itemsProp);
      setMovingId(null);
      toast.error(err.message);
    },
  });

  const moveItem = useCallback(
    (item: WorkItem, newStatus: WorkItemStatus) => {
      if (item.status === newStatus) return;

      const previousItems = boardItems;
      setMovingId(item.id);
      applyStatusChange(item.id, newStatus);

      if (statusFilter && newStatus !== statusFilter) {
        setBoardItems((prev) => prev.filter((i) => i.id !== item.id));
      }

      statusMutation.mutate(
        { itemId: item.id, status: newStatus },
        {
          onError: () => {
            setBoardItems(previousItems);
          },
        },
      );
    },
    [applyStatusChange, boardItems, statusFilter, statusMutation],
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

  if (isLoading) {
    return (
      <BoardScrollArea>
        {columns.map((col) => (
          <Skeleton
            key={col.value}
            className="h-[420px] w-[340px] shrink-0 rounded-xl"
          />
        ))}
      </BoardScrollArea>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {truncatedTotal !== undefined && truncatedTotal > boardItems.length ? (
        <p className="text-xs text-muted-foreground">
          Showing {boardItems.length} of {truncatedTotal} items. Use filters or
          switch to table view to see more.
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
        <BoardScrollArea className="min-h-[calc(100vh-14rem)]">
          {columns.map((column) => {
            const columnItems = itemsByStatus.get(column.value) ?? [];
            return (
              <BoardColumn
                key={column.value}
                id={column.value}
                droppableData={{ type: "status-column", status: column.value }}
                title={column.label}
                count={columnItems.length}
                countSingular={countSingular}
                countPlural={countPlural}
                totalValue={sumWorkItemColumnAmount(columnItems)}
                isOver={overStatus === column.value}
                isDragging={activeItem !== null}
                collapsed={collapsedColumns[column.value]}
                onToggleCollapse={() => toggleColumn(column.value)}
              >
                {columnItems.map((item) => (
                  <WorkItemBoardCard
                    key={item.id}
                    item={item}
                    isMoving={movingId === item.id}
                    onEdit={onEdit}
                  />
                ))}
              </BoardColumn>
            );
          })}
        </BoardScrollArea>

        <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
          {activeItem ? (
            <WorkItemBoardCard item={activeItem} isOverlay onEdit={onEdit} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
