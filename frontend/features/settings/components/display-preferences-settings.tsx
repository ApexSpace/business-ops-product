"use client";

import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { CalendarCancelledVisibilitySection } from "@/features/calendar-display-settings/components/calendar-cancelled-visibility-section";
import { CalendarHighContrastSection } from "@/features/calendar-display-settings/components/calendar-high-contrast-section";
import { CalendarVisibleHoursSection } from "@/features/calendar-display-settings/components/calendar-visible-hours-section";
import { CalendarWeekStartSection } from "@/features/calendar-display-settings/components/calendar-week-start-section";
import { CalendarZoomLevelSection } from "@/features/calendar-display-settings/components/calendar-zoom-level-section";
import { useCalendarDisplaySettings } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

export function DisplayPreferencesSettings() {
  const { isLoading, isError, error } = useCalendarDisplaySettings();

  if (isLoading) {
    return <LoadingState label="Loading display preferences…" />;
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Could not load display preferences"}
      </p>
    );
  }

  return (
    <SettingsFormPage
      title="Display Preferences"
      description="Configure how appointments appear on your calendar."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <CalendarVisibleHoursSection />
        <CalendarWeekStartSection />
        <CalendarZoomLevelSection />
        <CalendarCancelledVisibilitySection />
        <CalendarHighContrastSection />
      </div>
    </SettingsFormPage>
  );
}
