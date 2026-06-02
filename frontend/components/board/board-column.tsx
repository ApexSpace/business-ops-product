"use client";

import { useDroppable } from "@dnd-kit/core";
import { BoardColumnHeader } from "@/components/board/board-column-header";
import { cn } from "@/lib/utils";

export interface BoardColumnProps {
  id: string;
  droppableData?: Record<string, unknown>;
  title: string;
  count: number;
  countSingular: string;
  countPlural?: string;
  totalValue: number;
  isOver?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isDragging?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function BoardColumn({
  id,
  droppableData,
  title,
  count,
  countSingular,
  countPlural,
  totalValue,
  isOver,
  collapsed,
  onToggleCollapse,
  isDragging,
  children,
  className,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
    data: droppableData,
  });

  const hasChildren = count > 0;

  return (
    <div
      className={cn(
        "flex h-full w-[340px] shrink-0 flex-col gap-3",
        className,
      )}
    >
      <BoardColumnHeader
        title={title}
        count={count}
        countSingular={countSingular}
        countPlural={countPlural}
        totalValue={totalValue}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />

      {!collapsed ? (
        <div
          ref={setNodeRef}
          className={cn(
            "flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-transparent p-0.5 transition-colors",
            hasChildren ? "min-h-0" : isDragging ? "min-h-[100px]" : "min-h-0",
            isOver &&
              isDragging &&
              "border-primary/30 bg-primary/5 ring-2 ring-primary/15",
          )}
        >
          {hasChildren ? children : null}
        </div>
      ) : null}
    </div>
  );
}

export function BoardScrollArea({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
