"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionActionDefinition } from "@/features/platform/types/business-subscription";
import { groupActionsByCategory } from "@/features/platform/utils/business-subscription-actions";

const CATEGORY_LABELS: Record<string, string> = {
  billing: "Billing",
  trial: "Trial",
  access: "Access",
  package: "Package",
  snapshot: "Snapshot",
  danger: "Danger",
};

export function SubscriptionActionGroups({
  actions,
  canUpdate,
  onAction,
  isLoading,
  excludeActionKey,
}: {
  actions: SubscriptionActionDefinition[];
  canUpdate: boolean;
  onAction: (action: SubscriptionActionDefinition) => void;
  isLoading?: boolean;
  excludeActionKey?: SubscriptionActionDefinition["key"] | null;
}) {
  const groups = groupActionsByCategory(actions, excludeActionKey);

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
                {CATEGORY_LABELS[category] ?? category}
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
  canUpdate,
  onAction,
  isLoading,
}: {
  action: SubscriptionActionDefinition | null | undefined;
  canUpdate: boolean;
  onAction: (action: SubscriptionActionDefinition) => void;
  isLoading?: boolean;
}) {
  if (!action || !canUpdate) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recommended Action</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">{action.label}</p>
          {action.description && (
            <p className="text-sm text-muted-foreground">{action.description}</p>
          )}
        </div>
        <Button
          size="sm"
          disabled={!action.enabled || isLoading}
          title={action.disabledReason}
          onClick={() => onAction(action)}
        >
          {action.label}
        </Button>
      </CardContent>
    </Card>
  );
}
