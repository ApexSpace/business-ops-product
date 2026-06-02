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

export interface RowAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface DataTableRowActionsProps {
  actions: RowAction[];
  menuLabel?: string;
}

export function DataTableRowActions({
  actions,
  menuLabel = "Row actions",
}: DataTableRowActionsProps) {
  const visibleActions = actions.filter((action) => !action.disabled);
  if (visibleActions.length === 0) return null;

  const firstDestructiveIndex = visibleActions.findIndex(
    (action) => action.destructive,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton aria-label={menuLabel} className="size-8">
            <MoreVertical className="size-4" />
          </IconButton>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        {visibleActions.map((action, index) => (
          <span key={action.label}>
            {index === firstDestructiveIndex && firstDestructiveIndex > 0 ? (
              <DropdownMenuSeparator />
            ) : null}
            <DropdownMenuItem
              variant={action.destructive ? "destructive" : "default"}
              onClick={action.onClick}
            >
              {action.label}
            </DropdownMenuItem>
          </span>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
