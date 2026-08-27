"use client";

import { Clock, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import { BoardCard } from "@/components/board";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import {
  getLeadContactName,
  getLeadServiceLabel,
} from "@/features/leads/utils/leads";
import type { Lead } from "@/features/leads/types";
import { formatMoney } from "@/features/payments/utils/currencies";
import { formatRelativeTime } from "@/lib/ui/relative-time";
import { parseBoardAmount } from "@/components/board";
import { cn } from "@/lib/utils";

interface PipelineLeadCardProps {
  lead: Lead;
  accentColor: string;
  isOverlay?: boolean;
  isMoving?: boolean;
  onOpen?: (lead: Lead) => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
}

export function PipelineLeadCard({
  lead,
  accentColor,
  isOverlay,
  isMoving,
  onOpen,
  onEdit,
  onDelete,
}: PipelineLeadCardProps) {
  const contactName = getLeadContactName(lead);
  const serviceLabel = getLeadServiceLabel(lead);
  const amount = parseBoardAmount(lead.value);
  const valueLabel = formatMoney(amount);
  const showService = serviceLabel !== "—";

  return (
    <BoardCard
      id={lead.id}
      dragData={{ type: "lead", lead }}
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
            <div className="flex min-w-0 items-center gap-2">
              <ProfileAvatar
                name={contactName}
                className="size-8 shrink-0"
                fallbackClassName="bg-primary/10 text-[11px] font-semibold text-primary"
              />
              <button
                type="button"
                className="line-clamp-2 text-left text-[13px] font-semibold leading-snug text-foreground hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen?.(lead);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                data-no-dnd
              >
                {contactName}
              </button>
            </div>

            {!isOverlay ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <MoreActionsButton
                      aria-label="Lead actions"
                      className="text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100"
                      data-no-dnd
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  }
                />
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => onEdit?.(lead)}
                    className="gap-2"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(lead)}
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

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <Clock className="size-3 shrink-0" aria-hidden />
              Updated {formatRelativeTime(lead.updatedAt)}
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
