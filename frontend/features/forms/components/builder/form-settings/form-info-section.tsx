"use client";

import type { FormSettings } from "@/features/forms/types";
import { SettingInput } from "@/features/forms/components/builder/settings-controls/setting-input";
import { SettingRow } from "@/features/forms/components/builder/settings-controls/setting-row";
import { SettingToggle } from "@/features/forms/components/builder/settings-controls/setting-toggle";
import { FORMS_BUILDER_SETTINGS_STACK_CLASS } from "@/lib/design/forms-builder-tokens";

interface FormInfoSectionProps {
  settings: FormSettings;
  onUpdate: (patch: Partial<FormSettings>) => void;
}

export function FormInfoSection({ settings, onUpdate }: FormInfoSectionProps) {
  return (
    <div className={FORMS_BUILDER_SETTINGS_STACK_CLASS}>
      <SettingRow label="Form Name">
        <SettingInput
          value={settings.title}
          onChange={(value) => onUpdate({ title: value })}
          placeholder="Enter a name for this form"
        />
      </SettingRow>
      <SettingRow label="Description">
        <SettingInput
          value={settings.description ?? ""}
          onChange={(value) => onUpdate({ description: value })}
          placeholder="Enter a short description for this form"
          multiline
          rows={3}
        />
      </SettingRow>
      <SettingToggle
        label="Show required indicator"
        description="Respondents cannot submit without filling this"
        labelClassName="text-violet-primary-normal"
        checked={settings.showRequiredIndicator}
        onChange={(checked) => onUpdate({ showRequiredIndicator: checked })}
      />
      <SettingRow label="Notification Email">
        <SettingInput
          value={settings.notifyEmail ?? ""}
          onChange={(value) => onUpdate({ notifyEmail: value })}
          type="email"
          placeholder="Enter email to receive the notification"
        />
      </SettingRow>
    </div>
  );
}
