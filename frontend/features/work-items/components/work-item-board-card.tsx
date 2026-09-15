"use client";

import {
  Calendar,
  Clock,
  Pencil,
  SlidersHorizontal,
  Trash2,
  User,
} from "lucide-react";
import { BoardCard, parseBoardAmount } from "@/components/board";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import {
  formatWorkItemScheduledAt,
  getWorkItemAssigneeName,
} from "@/features/work-items/schemas/work-item-profile";
import type { WorkItem } from "@/features/work-items/types";
import { formatMoney } from "@/features/payments/utils/currencies";
import { formatRelativeTime } from "@/lib/ui/relative-time";
import { cn } from "@/lib/utils";

function getWorkItemContactName(item: WorkItem): string {
  return item.contact?.label?.trim() || "Unknown customer";
}

function getWorkItemServiceLabel(item: WorkItem): string {
  if (!item.service) return "";
  const parts = [item.service.name];
  if (item.service.category?.trim()) {
    parts.push(`(${item.service.category.trim()})`);
  }
  return parts.join(" ");
}

interface WorkItemBoardCardProps {
  item: WorkItem;
  accentColor: string;
  isOverlay?: boolean;
  isMoving?: boolean;
  onEdit?: (item: WorkItem) => void;
  onDelete?: (item: WorkItem) => void;
}

export function WorkItemBoardCard({
  item,
  accentColor,
  isOverlay,
  isMoving,
  onEdit,
  onDelete,
}: WorkItemBoardCardProps) {
  const contactName = getWorkItemContactName(item);
  const serviceLabel = getWorkItemServiceLabel(item);
  const amount = parseBoardAmount(item.amount);
  const valueLabel = formatMoney(amount);
  const showService = Boolean(serviceLabel);
  const scheduled = formatWorkItemScheduledAt(item.scheduledAt);
  const assignee = getWorkItemAssigneeName(item);

  return (
    <BoardCard
      id={item.id}
      dragData={{ type: "work-item", item }}
      isOverlay={isOverlay}
      isMoving={isMoving}
      className={cn(
        "relative gap-0 overflow-hidden border-border/70 p-0 shadow-sm hover:shadow-md",
        isOverlay && "shadow-lg",
      )}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accentColor }}
        aria-hidden
      />
      <div className="flex flex-col gap-2.5 py-3 pl-4 pr-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ProfileAvatar
                name={contactName}
                className="size-8 shrink-0"
                fallbackClassName="bg-primary/10 text-[11px] font-semibold text-primary"
              />
              <div className="min-w-0">
                <button
                  type="button"
                  className="line-clamp-1 text-left text-[13px] font-semibold leading-snug text-foreground hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(item);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  data-no-dnd
                >
                  {contactName}
                </button>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {item.title}
                </p>
              </div>
            </div>
          </div>

          {!isOverlay ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <MoreActionsButton
                    aria-label="Work item actions"
                    className="text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100"
                    data-no-dnd
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => onEdit?.(item)}
                  className="gap-2"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(item)}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {showService ? (
          <span className="inline-flex w-fit max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            <SlidersHorizontal className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{serviceLabel}</span>
          </span>
        ) : null}

        {scheduled || assignee ? (
          <div className="flex flex-col gap-1">
            {scheduled ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="size-3 shrink-0" aria-hidden />
                {scheduled}
              </span>
            ) : null}
            {assignee ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <User className="size-3 shrink-0" aria-hidden />
                {assignee}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
            <Clock className="size-3 shrink-0" aria-hidden />
            Updated {formatRelativeTime(item.updatedAt)}
          </span>
          <span
            className={cn(
              "shrink-0 text-xs font-semibold tabular-nums",
              amount > 0 ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {valueLabel}
          </span>
        </div>
      </div>
    </BoardCard>
  );
}
