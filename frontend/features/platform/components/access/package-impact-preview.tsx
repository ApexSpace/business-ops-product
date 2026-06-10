"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EffectiveCapability } from "@/features/platform/utils/business-access-resolver.util";

export function PackageImpactPreview({
  snapshotName,
  capabilities,
  amount,
  currency,
  trialDays,
  showDiff,
  toAdd = [],
  toRemove = [],
}: {
  snapshotName?: string | null;
  capabilities: EffectiveCapability[];
  amount?: string | null;
  currency?: string | null;
  trialDays?: number | null;
  showDiff?: boolean;
  toAdd?: EffectiveCapability[];
  toRemove?: EffectiveCapability[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Impact Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Snapshot</p>
          <p>{snapshotName ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Capabilities ({capabilities.length})</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {capabilities.length === 0 ? (
              <span className="text-amber-600">No active capabilities on this tier</span>
            ) : (
              capabilities.map((cap) => (
                <Badge key={cap.key} variant="secondary">
                  {cap.name}
                </Badge>
              ))
            )}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p>{amount ? `${amount} ${currency ?? ""}`.trim() : "—"}</p>
          </div>
          {trialDays != null && (
            <div>
              <p className="text-xs text-muted-foreground">Trial days</p>
              <p>{trialDays}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Plan Tier decides capabilities. Snapshot controls labels, navigation, and
          experience.
        </p>
        {showDiff && (toAdd.length > 0 || toRemove.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-green-700">To add</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {toAdd.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  toAdd.map((cap) => (
                    <Badge key={cap.key} className="bg-green-100 text-green-800">
                      {cap.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-red-700">To remove</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {toRemove.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  toRemove.map((cap) => (
                    <Badge key={cap.key} variant="destructive">
                      {cap.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
