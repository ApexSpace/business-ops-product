"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionActionDefinition } from "@/features/platform/types/business-subscription";
import {
  ACCESS_TAB_CATEGORY_LABELS,
  applyFriendlyActionLabels,
  buildActionLabelContext,
  groupActionsByCategory,
} from "@/features/platform/utils/business-subscription-actions";
import type { BusinessAccess } from "@/features/platform/types/business-access";

export function SubscriptionActionGroups({
  actions,
  access,
  canUpdate,
  onAction,
  isLoading,
  excludeActionKey,
}: {
  actions: SubscriptionActionDefinition[];
  access?: BusinessAccess;
  canUpdate: boolean;
  onAction: (action: SubscriptionActionDefinition) => void;
  isLoading?: boolean;
  excludeActionKey?: SubscriptionActionDefinition["key"] | null;
}) {
  const labelContext = access ? buildActionLabelContext(access) : {};
  const friendlyActions = applyFriendlyActionLabels(actions, labelContext);
  const groups = groupActionsByCategory(friendlyActions, excludeActionKey);

  if (!canUpdate) return null;

  const hasAny = Object.values(groups).some((g) => g.length > 0);
  if (!hasAny) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No actions available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {Object.entries(groups).map(([category, categoryActions]) => {
          if (categoryActions.length === 0) return null;
          return (
            <div key={category} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {ACCESS_TAB_CATEGORY_LABELS[category] ?? category}
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryActions.map((action) => (
                  <Button
                    key={action.key}
                    size="sm"
                    variant={action.severity === "danger" ? "outline" : "secondary"}
                    className={
                      action.severity === "danger"
                        ? "border-destructive/50 text-destructive hover:bg-destructive/10"
                        : undefined
                    }
                    disabled={!action.enabled || isLoading}
                    title={action.disabledReason}
                    onClick={() => onAction(action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function RecommendedActionCard({
  action,
  access,
  canUpdate,
  onAction,
  isLoading,
}: {
  action: SubscriptionActionDefinition | null | undefined;
  access?: BusinessAccess;
  canUpdate: boolean;
  onAction: (action: SubscriptionActionDefinition) => void;
  isLoading?: boolean;
}) {
  if (!action || !canUpdate) return null;

  const labelContext = access ? buildActionLabelContext(access) : {};
  const friendlyAction = applyFriendlyActionLabels([action], labelContext)[0];

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recommended Action</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">{friendlyAction.label}</p>
          {friendlyAction.description && (
            <p className="text-sm text-muted-foreground">{friendlyAction.description}</p>
          )}
        </div>
        <Button
          size="sm"
          disabled={!friendlyAction.enabled || isLoading}
          title={friendlyAction.disabledReason}
          onClick={() => onAction(action)}
        >
          {friendlyAction.label}
        </Button>
      </CardContent>
    </Card>
  );
}
