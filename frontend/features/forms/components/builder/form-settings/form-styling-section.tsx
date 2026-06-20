"use client";

import type { FormLayoutPreset, FormSettings } from "@/features/forms/types";
import { FORM_LAYOUT_SELECT_OPTIONS } from "@/features/forms/constants/form-layout-presets.constant";
import {
  applyFormLayoutPreset,
  getFormLayoutDescription,
  resolveFormLayout,
} from "@/features/forms/utils/form-layout.util";
import { SectionHeader } from "@/features/forms/components/builder/settings-controls/section-header";
import { ColorInput } from "@/features/forms/components/builder/settings-controls/color-input";
import { SettingInput } from "@/features/forms/components/builder/settings-controls/setting-input";
import { SettingRow } from "@/features/forms/components/builder/settings-controls/setting-row";
import { SettingSelect } from "@/features/forms/components/builder/settings-controls/setting-select";

interface FormStylingSectionProps {
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

const FONT_OPTIONS = [
  { value: "system", label: "System" },
  { value: "serif", label: "Serif" },
  { value: "sans", label: "Sans" },
  { value: "mono", label: "Mono" },
];

export function FormStylingSection({ settings, onUpdate }: FormStylingSectionProps) {
  const layout = resolveFormLayout(settings);

  return (
    <SectionHeader title="Form Styling">
      <SettingRow label="Form width">
        <SettingSelect
          value={layout}
          onChange={(value) =>
            onUpdate(applyFormLayoutPreset(value as FormLayoutPreset))
          }
          options={FORM_LAYOUT_SELECT_OPTIONS}
        />
      </SettingRow>
      <p className="-mt-1 mb-2 text-xs text-muted-foreground">
        {getFormLayoutDescription(layout)}
      </p>
      <SettingRow label="Padding (px)">
        <SettingInput
          type="number"
          value={settings.padding ?? 24}
          onChange={(value) => onUpdate({ padding: Number(value) || 24 })}
        />
      </SettingRow>
      <SettingRow label="Border radius">
        <SettingSelect
          value={settings.borderRadius ?? "lg"}
          onChange={(value) =>
            onUpdate({ borderRadius: value as FormSettings["borderRadius"] })
          }
          options={RADIUS_OPTIONS}
        />
      </SettingRow>
      <SettingRow label="Background color">
        <ColorInput
          value={settings.backgroundColor}
          onChange={(value) => onUpdate({ backgroundColor: value })}
        />
      </SettingRow>
      <SettingRow label="Text color">
        <ColorInput
          value={settings.textColor}
          onChange={(value) => onUpdate({ textColor: value })}
        />
      </SettingRow>
      <SettingRow label="Accent color">
        <ColorInput
          value={settings.accentColor}
          onChange={(value) => onUpdate({ accentColor: value })}
        />
      </SettingRow>
      <SettingRow label="Label font">
        <SettingSelect
          value={settings.labelFont ?? "system"}
          onChange={(value) =>
            onUpdate({ labelFont: value as FormSettings["labelFont"] })
          }
          options={FONT_OPTIONS}
        />
      </SettingRow>
      <SettingRow label="Input font">
        <SettingSelect
          value={settings.inputFont ?? "system"}
          onChange={(value) =>
            onUpdate({ inputFont: value as FormSettings["inputFont"] })
          }
          options={FONT_OPTIONS}
        />
      </SettingRow>
    </SectionHeader>
  );
}
