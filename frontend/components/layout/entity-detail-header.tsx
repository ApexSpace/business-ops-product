"use client";

import { MoreActionsButton } from "@/components/ui/more-actions-button";
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
  /** `on-brand` — white ghost control for mobile-brand drawer headers. */
  tone?: "default" | "on-brand";
  className?: string;
}

/**
 * Header action cluster for entity drawers (inline actions + overflow).
 * Icon hover chrome is owned by DrawerShell header slot / IconButton `header`.
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
            render={<MoreActionsButton aria-label="More actions" />}
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
