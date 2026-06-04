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
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  statusOptions: FinancialStatusOption<TStatus>[];
  onStatusChange: (status: TStatus) => void;
  extraItems?: React.ReactNode;
}

export function FinancialRowActionsMenu<TStatus extends string>({
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  statusOptions,
  onStatusChange,
  extraItems,
}: FinancialRowActionsMenuProps<TStatus>) {
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
        <DropdownMenuItem onClick={onView}>View / Open</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
        {extraItems}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {statusOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
