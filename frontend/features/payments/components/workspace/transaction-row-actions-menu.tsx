"use client";

import { MoreVertical } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TransactionRowActionsMenuProps {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionRowActionsMenu({
  onView,
  onEdit,
  onDelete,
}: TransactionRowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton aria-label="Row actions" className="size-8">
            <MoreVertical className="size-4" />
          </IconButton>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onView}>View / Open</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
