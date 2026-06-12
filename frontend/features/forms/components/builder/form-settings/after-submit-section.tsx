"use client";

import type { FormSettings } from "@/features/forms/types";
import { SectionHeader } from "@/features/forms/components/builder/settings-controls/section-header";
import { SettingInput } from "@/features/forms/components/builder/settings-controls/setting-input";
import { SettingRow } from "@/features/forms/components/builder/settings-controls/setting-row";

interface AfterSubmitSectionProps {
  settings: FormSettings;
  onUpdate: (patch: Partial<FormSettings>) => void;
}

export function AfterSubmitSection({ settings, onUpdate }: AfterSubmitSectionProps) {
  return (
    <SectionHeader title="After Submit">
      <SettingRow label="Success message">
        <SettingInput
          value={settings.successMessage}
          onChange={(value) => onUpdate({ successMessage: value })}
          multiline
          rows={3}
        />
      </SettingRow>
      <SettingRow label="Redirect URL">
        <SettingInput
          value={settings.redirectUrl ?? ""}
          onChange={(value) => onUpdate({ redirectUrl: value })}
          type="url"
          placeholder="https://example.com/thank-you"
        />
      </SettingRow>
    </SectionHeader>
  );
}
