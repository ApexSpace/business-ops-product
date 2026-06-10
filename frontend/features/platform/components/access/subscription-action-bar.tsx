"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SubscriptionActionDefinition } from "@/features/platform/types/business-subscription";
import type { SubscriptionTabActionLayout } from "@/features/platform/utils/business-subscription-actions";

const DANGER_ACTION_KEYS = new Set<SubscriptionActionDefinition["key"]>([
  "CANCEL_SUBSCRIPTION",
  "EXPIRE_TRIAL",
  "SUSPEND_BUSINESS",
]);

export function SubscriptionActionBar({
  layout,
  canUpdate,
  isLoading,
  onAction,
  onManageAccess,
}: {
  layout: SubscriptionTabActionLayout;
  canUpdate: boolean;
  isLoading?: boolean;
  onAction: (action: SubscriptionActionDefinition) => void;
  onManageAccess?: () => void;
}) {
  if (!canUpdate) return null;

  const { primary, secondary, moreGroups, trialEndingSoon, showManageAccessSecondary } =
    layout;

  const hasHeaderActions =
    primary || secondary || showManageAccessSecondary || moreGroups.length > 0;

  if (!hasHeaderActions) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      {trialEndingSoon ? (
        <p className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-4 shrink-0" />
          Trial ends soon
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {primary ? (
          <Button
            type="button"
            size="sm"
            disabled={!primary.enabled || isLoading}
            title={primary.disabledReason}
            onClick={() => onAction(primary)}
          >
            {primary.label}
          </Button>
        ) : null}
        {secondary ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!secondary.enabled || isLoading}
            title={secondary.disabledReason}
            onClick={() => onAction(secondary)}
          >
            {secondary.label}
          </Button>
        ) : showManageAccessSecondary && onManageAccess ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isLoading}
            onClick={onManageAccess}
          >
            Manage Access
          </Button>
        ) : null}
        {moreGroups.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" size="sm" variant="outline" disabled={isLoading}>
                  More actions
                  <ChevronDown className="ml-1 size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              {moreGroups.map((group, groupIndex) => (
                <div key={group.id}>
                  {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                    {group.actions.map((action) => (
                      <DropdownMenuItem
                        key={action.key}
                        variant={
                          DANGER_ACTION_KEYS.has(action.key) ? "destructive" : "default"
                        }
                        disabled={!action.enabled || isLoading}
                        title={action.disabledReason}
                        onClick={() => onAction(action)}
                      >
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
