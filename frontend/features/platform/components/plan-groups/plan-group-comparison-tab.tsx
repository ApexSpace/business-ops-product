"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  createPlatformPlanFeatureRow,
  deletePlatformPlanFeatureRow,
  updatePlatformPlanFeatureRow,
} from "@/features/platform/api/plan-groups.api";
import type {
  FeatureRowTierValue,
  PlanFeatureRow,
  PlanTier,
} from "@/features/platform/types/plan-group";
import { queryKeys } from "@/lib/query/keys";

type PlanGroupComparisonTabProps = {
  planGroupId: string;
  tiers: PlanTier[];
  featureRows: PlanFeatureRow[];
  canManage: boolean;
};

export function PlanGroupComparisonTab({
  planGroupId,
  tiers,
  featureRows,
  canManage,
}: PlanGroupComparisonTabProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.platform.planGroups.all(),
    });

  const createMutation = useMutation({
    mutationFn: () =>
      createPlatformPlanFeatureRow(planGroupId, {
        label: "New feature",
        values: Object.fromEntries(
          tiers.map((t) => [t.slug, { included: false }]),
        ),
      }),
    onSuccess: () => {
      toast.success("Row added");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      rowId,
      body,
    }: {
      rowId: string;
      body: Record<string, unknown>;
    }) => updatePlatformPlanFeatureRow(planGroupId, rowId, body),
    onSuccess: () => {
      toast.success("Row updated");
      void invalidate();
      setEditingId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (rowId: string) =>
      deletePlatformPlanFeatureRow(planGroupId, rowId),
    onSuccess: () => {
      toast.success("Row deleted");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function updateTierValue(
    row: PlanFeatureRow,
    tierSlug: string,
    patch: Partial<FeatureRowTierValue>,
  ) {
    const values = { ...row.values, [tierSlug]: { ...row.values[tierSlug], ...patch } };
    updateMutation.mutate({ rowId: row.id, body: { values } });
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <Button type="button" onClick={() => createMutation.mutate()}>
          <Plus className="mr-2 size-4" />
          Add row
        </Button>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border px-3 py-2 text-left">Feature</th>
              {tiers.map((tier) => (
                <th key={tier.id} className="border px-3 py-2">
                  {tier.name}
                </th>
              ))}
              {canManage ? <th className="border px-3 py-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {featureRows.map((row) => (
              <tr key={row.id}>
                <td className="border px-3 py-2 align-top">
                  {canManage && editingId === row.id ? (
                    <div className="space-y-2">
                      <Input
                        defaultValue={row.label}
                        onBlur={(e) =>
                          updateMutation.mutate({
                            rowId: row.id,
                            body: { label: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Tooltip"
                        defaultValue={row.tooltip ?? ""}
                        onBlur={(e) =>
                          updateMutation.mutate({
                            rowId: row.id,
                            body: { tooltip: e.target.value || undefined },
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">{row.label}</div>
                      {row.tooltip ? (
                        <div className="text-xs text-muted-foreground">
                          {row.tooltip}
                        </div>
                      ) : null}
                    </div>
                  )}
                </td>
                {tiers.map((tier) => {
                  const val = row.values[tier.slug] ?? { included: false };
                  return (
                    <td key={tier.id} className="border px-3 py-2 align-top">
                      {canManage ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={val.included}
                              onCheckedChange={(checked) =>
                                updateTierValue(row, tier.slug, {
                                  included: checked,
                                })
                              }
                            />
                            <span className="text-xs">Included</span>
                          </div>
                          <Input
                            placeholder="Custom text"
                            defaultValue={val.text ?? ""}
                            onBlur={(e) =>
                              updateTierValue(row, tier.slug, {
                                included: val.included,
                                text: e.target.value || undefined,
                              })
                            }
                          />
                        </div>
                      ) : (
                        <span>{val.text || (val.included ? "✓" : "—")}</span>
                      )}
                    </td>
                  );
                })}
                {canManage ? (
                  <td className="border px-3 py-2 align-top">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditingId(editingId === row.id ? null : row.id)
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(row.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
