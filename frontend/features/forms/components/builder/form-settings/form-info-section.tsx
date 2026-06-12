"use client";

import type { FormSettings } from "@/features/forms/types";
import { SectionHeader } from "@/features/forms/components/builder/settings-controls/section-header";
import { SettingInput } from "@/features/forms/components/builder/settings-controls/setting-input";
import { SettingRow } from "@/features/forms/components/builder/settings-controls/setting-row";
import { SettingToggle } from "@/features/forms/components/builder/settings-controls/setting-toggle";

interface FormInfoSectionProps {
  settings: FormSettings;
  onUpdate: (patch: Partial<FormSettings>) => void;
}

export function FormInfoSection({ settings, onUpdate }: FormInfoSectionProps) {
  return (
    <SectionHeader title="Form Info">
      <SettingRow label="Title">
        <SettingInput
          value={settings.title}
          onChange={(value) => onUpdate({ title: value })}
        />
      </SettingRow>
      <SettingRow label="Description">
        <SettingInput
          value={settings.description ?? ""}
          onChange={(value) => onUpdate({ description: value })}
          multiline
          rows={3}
        />
      </SettingRow>
      <SettingToggle
        label="Show required indicator"
        checked={settings.showRequiredIndicator}
        onChange={(checked) => onUpdate({ showRequiredIndicator: checked })}
      />
      <SettingRow label="Notification email">
        <SettingInput
          value={settings.notifyEmail ?? ""}
          onChange={(value) => onUpdate({ notifyEmail: value })}
          type="email"
          placeholder="you@company.com"
        />
      </SettingRow>
    </SectionHeader>
  );
}
