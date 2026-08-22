"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface EntityDetailOverflowAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onSelect: () => void;
}

interface EntityDetailHeaderProps {
  actions?: React.ReactNode;
  overflowActions?: EntityDetailOverflowAction[];
  className?: string;
}

/**
 * Header action cluster for entity drawers (inline actions + overflow).
 * Chrome lives on DrawerShell — this is not a second header.
 */
export function EntityDetailHeader({
  actions,
  overflowActions,
  className,
}: EntityDetailHeaderProps) {
  const hasOverflow = overflowActions && overflowActions.length > 0;
  if (!actions && !hasOverflow) {
    return null;
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      {actions}
      {hasOverflow ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">More actions</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            {overflowActions.map((action, index) => (
              <div key={action.id}>
                {action.destructive && index > 0 ? (
                  <DropdownMenuSeparator />
                ) : null}
                <DropdownMenuItem
                  variant={action.destructive ? "destructive" : "default"}
                  onClick={action.onSelect}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
