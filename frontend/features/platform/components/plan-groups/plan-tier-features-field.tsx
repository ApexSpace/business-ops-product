"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TierFeatureInput } from "@/features/platform/types/plan-group";

type PlanTierFeaturesFieldProps = {
  features: TierFeatureInput[];
  onChange: (features: TierFeatureInput[]) => void;
  disabled?: boolean;
};

function reorderFeatures(
  features: TierFeatureInput[],
  fromIndex: number,
  toIndex: number,
): TierFeatureInput[] {
  if (toIndex < 0 || toIndex >= features.length) return features;
  const next = [...features];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next.map((feature, index) => ({ ...feature, sortOrder: index }));
}

export function PlanTierFeaturesField({
  features,
  onChange,
  disabled = false,
}: PlanTierFeaturesFieldProps) {
  const addFeature = () => {
    onChange([
      ...features,
      {
        label: "",
        included: true,
        sortOrder: features.length,
      },
    ]);
  };

  const updateFeature = (
    index: number,
    patch: Partial<TierFeatureInput>,
  ) => {
    onChange(
      features.map((feature, i) =>
        i === index ? { ...feature, ...patch } : feature,
      ),
    );
  };

  const removeFeature = (index: number) => {
    onChange(
      features
        .filter((_, i) => i !== index)
        .map((feature, sortOrder) => ({ ...feature, sortOrder })),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Label className="text-sm font-medium">
            Features shown on pricing card
          </Label>
          <p className="text-xs text-muted-foreground">
            Public-facing bullet points shown on pricing cards, separate from
            capabilities.
          </p>
        </div>
        {disabled ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={addFeature}
          >
            <Plus className="mr-2 size-4" />
            Add Feature
          </Button>
        )}
      </div>

      {features.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No features added yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li
              key={feature.id ?? `feature-${index}`}
              className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-2"
            >
              <Checkbox
                checked={feature.included}
                disabled={disabled}
                aria-label="Included"
                onCheckedChange={(checked) =>
                  updateFeature(index, { included: checked === true })
                }
              />
              <Input
                value={feature.label}
                disabled={disabled}
                placeholder="Feature label"
                className="min-w-[12rem] flex-1"
                onChange={(event) =>
                  updateFeature(index, { label: event.target.value })
                }
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={disabled || index === 0}
                  aria-label="Move up"
                  onClick={() =>
                    onChange(reorderFeatures(features, index, index - 1))
                  }
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={disabled || index === features.length - 1}
                  aria-label="Move down"
                  onClick={() =>
                    onChange(reorderFeatures(features, index, index + 1))
                  }
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={disabled}
                  aria-label="Delete feature"
                  onClick={() => removeFeature(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
