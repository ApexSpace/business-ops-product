"use client";

import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { CalendarCancelledVisibilitySection } from "@/features/calendar-display-settings/components/calendar-cancelled-visibility-section";
import { CalendarHighContrastSection } from "@/features/calendar-display-settings/components/calendar-high-contrast-section";
import { CalendarWeekStartSection } from "@/features/calendar-display-settings/components/calendar-week-start-section";
import { CalendarZoomLevelSection } from "@/features/calendar-display-settings/components/calendar-zoom-level-section";
import { PrimaryAccountSection } from "@/features/payment-accounts/components/primary-account-section";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

export function PaymentAccountsSettingsScreen() {
  return (
    <SettingsFormPage
      title="Payment Accounts"
      description="Customize your calendar's display and visibility settings."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <PrimaryAccountSection />
        <CalendarWeekStartSection />
        <CalendarZoomLevelSection />
        <CalendarCancelledVisibilitySection />
        <CalendarHighContrastSection />
      </div>
    </SettingsFormPage>
  );
}
