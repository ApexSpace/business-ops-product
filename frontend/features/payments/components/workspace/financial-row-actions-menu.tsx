"use client";

import { MoreVertical } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FinancialStatusOption<T extends string = string> {
  value: T;
  label: string;
}

export interface FinancialRowActionsMenuProps<TStatus extends string = string> {
  onView: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onRefund?: () => void;
  viewLabel?: string;
  statusOptions?: FinancialStatusOption<TStatus>[];
  onStatusChange?: (status: TStatus) => void;
  onVoid?: () => void;
  extraItems?: React.ReactNode;
}

export function FinancialRowActionsMenu<TStatus extends string>({
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  viewLabel = "View / Open",
  statusOptions = [],
  onStatusChange,
  onVoid,
  onRefund,
  extraItems,
}: FinancialRowActionsMenuProps<TStatus>) {
  const showStatusSubmenu =
    statusOptions.length > 0 && !!onStatusChange && !onVoid;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton aria-label="Row actions" className="size-8">
            <MoreVertical className="size-4" />
          </IconButton>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>{viewLabel}</DropdownMenuItem>
        {onEdit ? (
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        ) : null}
        {onDuplicate ? (
          <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
        ) : null}
        {extraItems}
        {onVoid ? (
          <DropdownMenuItem onClick={onVoid}>Void invoice</DropdownMenuItem>
        ) : null}
        {showStatusSubmenu ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {statusOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => onStatusChange!(opt.value)}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {onRefund ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onRefund}>
              Refund
            </DropdownMenuItem>
          </>
        ) : null}
        {onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
