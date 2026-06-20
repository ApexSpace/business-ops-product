"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
      <div className="flex items-center justify-between gap-3 py-2">
        <div>
          <Label>Create inbox conversation on submit</Label>
          <p className="text-xs text-muted-foreground">
            High-intent submissions appear in Conversations for follow-up.
          </p>
        </div>
        <Checkbox
          checked={settings.createConversationOnSubmit ?? false}
          onCheckedChange={(checked) =>
            onUpdate({ createConversationOnSubmit: checked === true })
          }
        />
      </div>
    </SectionHeader>
  );
}
