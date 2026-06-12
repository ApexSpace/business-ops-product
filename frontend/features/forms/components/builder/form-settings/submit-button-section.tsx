"use client";

import type { FormSettings } from "@/features/forms/types";
import { SectionHeader } from "@/features/forms/components/builder/settings-controls/section-header";
import { ColorInput } from "@/features/forms/components/builder/settings-controls/color-input";
import { SettingInput } from "@/features/forms/components/builder/settings-controls/setting-input";
import { SettingRow } from "@/features/forms/components/builder/settings-controls/setting-row";
import { SettingSelect } from "@/features/forms/components/builder/settings-controls/setting-select";
import { SettingToggle } from "@/features/forms/components/builder/settings-controls/setting-toggle";

interface SubmitButtonSectionProps {
  settings: FormSettings;
  onUpdate: (patch: Partial<FormSettings>) => void;
}

const RADIUS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "full", label: "Full" },
];

const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export function SubmitButtonSection({ settings, onUpdate }: SubmitButtonSectionProps) {
  return (
    <SectionHeader title="Submit Button">
      <SettingRow label="Button text">
        <SettingInput
          value={settings.submitButtonLabel}
          onChange={(value) => onUpdate({ submitButtonLabel: value })}
        />
      </SettingRow>
      <SettingRow label="Border radius">
        <SettingSelect
          value={settings.submitButtonRadius ?? "md"}
          onChange={(value) =>
            onUpdate({ submitButtonRadius: value as FormSettings["submitButtonRadius"] })
          }
          options={RADIUS_OPTIONS}
        />
      </SettingRow>
      <SettingToggle
        label="Full width"
        checked={settings.submitButtonFullWidth ?? false}
        onChange={(checked) => onUpdate({ submitButtonFullWidth: checked })}
      />
      <SettingRow label="Alignment">
        <SettingSelect
          value={settings.submitButtonAlign ?? "left"}
          onChange={(value) =>
            onUpdate({ submitButtonAlign: value as FormSettings["submitButtonAlign"] })
          }
          options={ALIGN_OPTIONS}
        />
      </SettingRow>
      <SettingRow label="Background color">
        <ColorInput
          value={settings.submitButtonBgColor}
          onChange={(value) => onUpdate({ submitButtonBgColor: value })}
        />
      </SettingRow>
      <SettingRow label="Text color">
        <ColorInput
          value={settings.submitButtonTextColor}
          onChange={(value) => onUpdate({ submitButtonTextColor: value })}
        />
      </SettingRow>
    </SectionHeader>
  );
}
