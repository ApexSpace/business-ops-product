"use client";

import { useEffect, useState } from "react";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { updateHighContrast } from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import { useCalendarDisplaySettings } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings";
import { useCalendarDisplaySettingsMutation } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings-mutation";

export function CalendarHighContrastSection() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data } = useCalendarDisplaySettings();
  const mutation = useCalendarDisplaySettingsMutation();
  const [draft, setDraft] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setDraft(data.highContrastEnabled);
      setSaved(data.highContrastEnabled);
    }
  }, [data]);

  return (
    <SettingsToggleSection
      id="high-contrast-enabled"
      title="High Contrast Colors on Calendar"
      description="When enabled, areas of the calendar where a staff member is not scheduled will be displayed in a darker grey."
      checked={draft}
      onCheckedChange={(checked) => setDraft(checked)}
      onDiscard={() => setDraft(saved)}
      onSave={() =>
        mutation.mutate(() => updateHighContrast({ highContrastEnabled: draft }), {
          onSuccess: () => setSaved(draft),
        })
      }
      isDirty={draft !== saved}
      isSaving={mutation.isPending}
      disabled={!canEdit}
    />
  );
}
