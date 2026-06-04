"use client";

import { BoardColumn } from "@/components/board";
import { WorkItemBoardCard } from "@/features/work-items/components/work-item-board-card";
import { sumWorkItemColumnAmount } from "@/features/work-items/components/work-item-board-utils";
import type { WorkItem, WorkItemStatus } from "@/features/work-items/types";

export function WorkItemBoardColumn({
  column,
  columnItems,
  countSingular,
  countPlural,
  overStatus,
  activeItem,
  movingId,
  collapsed,
  onToggleCollapse,
  onEdit,
}: {
  column: { value: WorkItemStatus; label: string };
  columnItems: WorkItem[];
  countSingular: string;
  countPlural?: string;
  overStatus: WorkItemStatus | null;
  activeItem: WorkItem | null;
  movingId: string | null;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  onEdit: (item: WorkItem) => void;
}) {
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
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
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
}
