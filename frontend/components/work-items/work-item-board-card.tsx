"use client";

import {
  BoardCard,
  BoardCardBody,
  BoardCardField,
  BoardCardHeader,
} from "@/components/board";
import {
  formatWorkItemAmount,
  formatWorkItemScheduledAt,
  getWorkItemAssigneeName,
} from "@/lib/work-item-profile";
import type { WorkItem } from "@/types/api";

interface WorkItemBoardCardProps {
  item: WorkItem;
  isOverlay?: boolean;
  isMoving?: boolean;
  onEdit: (item: WorkItem) => void;
}

export function WorkItemBoardCard({
  item,
  isOverlay,
  isMoving,
  onEdit,
}: WorkItemBoardCardProps) {
  const scheduled = formatWorkItemScheduledAt(item.scheduledAt);
  const amount = formatWorkItemAmount(item.amount);
  const assignee = getWorkItemAssigneeName(item);

  return (
    <BoardCard
      id={item.id}
      dragData={{ type: "work-item", item }}
      isOverlay={isOverlay}
      isMoving={isMoving}
    >
      <BoardCardHeader
        title={item.title}
        onTitleClick={!isOverlay ? () => onEdit(item) : undefined}
      />

      <BoardCardBody>
        <BoardCardField label="Service" value={item.service?.name} />
        <BoardCardField label="Scheduled" value={scheduled} />
        <BoardCardField label="Assigned" value={assignee} />
        <BoardCardField label="Amount" value={amount} />
      </BoardCardBody>
    </BoardCard>
  );
}
