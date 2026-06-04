import { parseBoardAmount } from "@/components/board";
import { WORK_ITEM_STATUS_OPTIONS } from "@/features/work-items/schemas/work-item-profile";
import type { WorkItem, WorkItemStatus } from "@/features/work-items/types";

export function groupWorkItemsByStatus(
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

export function sumWorkItemColumnAmount(items: WorkItem[]): number {
  return items.reduce((sum, item) => sum + parseBoardAmount(item.amount), 0);
}
