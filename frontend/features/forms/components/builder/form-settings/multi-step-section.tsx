"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormField, FormSettings, FormStep } from "@/features/forms/types";
import { SectionHeader } from "@/features/forms/components/builder/settings-controls/section-header";
import { SettingInput } from "@/features/forms/components/builder/settings-controls/setting-input";
import { SettingRow } from "@/features/forms/components/builder/settings-controls/setting-row";
import { SettingToggle } from "@/features/forms/components/builder/settings-controls/setting-toggle";

interface MultiStepSectionProps {
  settings: FormSettings;
  fields: FormField[];
  onUpdate: (patch: Partial<FormSettings>) => void;
}

function generateStepId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `step_${Date.now()}`;
}

export function MultiStepSection({ settings, fields, onUpdate }: MultiStepSectionProps) {
  const steps = settings.steps ?? [];

  const updateSteps = (next: FormStep[]) => {
    onUpdate({ steps: next });
  };

  const addStep = () => {
    updateSteps([
      ...steps,
      {
        id: generateStepId(),
        title: `Step ${steps.length + 1}`,
        fieldIds: [],
      },
    ]);
  };

  const updateStep = (index: number, patch: Partial<FormStep>) => {
    const next = [...steps];
    next[index] = { ...next[index], ...patch };
    updateSteps(next);
  };

  const removeStep = (index: number) => {
    updateSteps(steps.filter((_, i) => i !== index));
  };

  const toggleFieldInStep = (stepIndex: number, fieldId: string) => {
    const step = steps[stepIndex];
    const hasField = step.fieldIds.includes(fieldId);
    const fieldIds = hasField
      ? step.fieldIds.filter((id) => id !== fieldId)
      : [...step.fieldIds, fieldId];
    updateStep(stepIndex, { fieldIds });
  };

  return (
    <SectionHeader title="Multi-Step">
      <p className="text-xs text-muted-foreground italic">
        Multi-step runtime rendering is not active yet; settings are saved for a
        future phase.
      </p>
      <SettingToggle
        label="Enable multi-step"
        checked={settings.multiStep ?? false}
        onChange={(checked) => onUpdate({ multiStep: checked })}
      />
      {settings.multiStep ? (
        <>
          <SettingToggle
            label="Show progress bar"
            checked={settings.showProgressBar ?? true}
            onChange={(checked) => onUpdate({ showProgressBar: checked })}
          />
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <SettingInput
                    value={step.title}
                    onChange={(value) => updateStep(index, { title: value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeStep(index)}
                    aria-label="Remove step"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <SettingRow label="Assign fields">
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {fields.map((field) => (
                      <label
                        key={field.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={step.fieldIds.includes(field.id)}
                          onChange={() => toggleFieldInStep(index, field.id)}
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                </SettingRow>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="mr-1 size-3" />
              Add step
            </Button>
          </div>
        </>
      ) : null}
    </SectionHeader>
  );
}
