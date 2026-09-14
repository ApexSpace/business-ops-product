"use client";

import type { FormField } from "@/features/forms/types";
import { SettingInput } from "@/features/forms/components/builder/settings-controls/setting-input";
import { SettingRow } from "@/features/forms/components/builder/settings-controls/setting-row";
import { SettingToggle } from "@/features/forms/components/builder/settings-controls/setting-toggle";
import { FORMS_BUILDER_SETTINGS_STACK_CLASS } from "@/lib/design/forms-builder-tokens";

interface FieldValidationSettingsProps {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}

export function FieldValidationSettings({
  field,
  onUpdate,
}: FieldValidationSettingsProps) {
  return (
    <div className={FORMS_BUILDER_SETTINGS_STACK_CLASS}>
      <SettingToggle
        label="Required"
        checked={field.validation?.required ?? false}
        onChange={(checked) =>
          onUpdate({
            validation: { ...field.validation, required: checked },
          })
        }
      />
      <SettingRow label="Min length">
        <SettingInput
          type="number"
          value={field.validation?.minLength ?? ""}
          onChange={(value) =>
            onUpdate({
              validation: {
                ...field.validation,
                minLength: value ? Number(value) : undefined,
              },
            })
          }
        />
      </SettingRow>
      <SettingRow label="Max length">
        <SettingInput
          type="number"
          value={field.validation?.maxLength ?? ""}
          onChange={(value) =>
            onUpdate({
              validation: {
                ...field.validation,
                maxLength: value ? Number(value) : undefined,
              },
            })
          }
        />
      </SettingRow>
      <SettingRow label="Pattern (regex)">
        <SettingInput
          value={field.validation?.pattern ?? ""}
          onChange={(value) =>
            onUpdate({
              validation: { ...field.validation, pattern: value || undefined },
            })
          }
        />
      </SettingRow>
      <SettingRow label="Pattern message">
        <SettingInput
          value={field.validation?.patternMessage ?? ""}
          onChange={(value) =>
            onUpdate({
              validation: {
                ...field.validation,
                patternMessage: value || undefined,
              },
            })
          }
        />
      </SettingRow>
      <SettingRow label="Custom message">
        <SettingInput
          value={field.validation?.customMessage ?? ""}
          onChange={(value) =>
            onUpdate({
              validation: {
                ...field.validation,
                customMessage: value || undefined,
              },
            })
          }
        />
      </SettingRow>
    </div>
  );
}
