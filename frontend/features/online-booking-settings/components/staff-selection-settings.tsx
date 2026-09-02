"use client";

import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { AnyoneAssignmentsSection } from "@/features/online-booking-settings/components/sections/anyone-assignments-section";
import { useOnlineBookingSettings } from "@/features/online-booking-settings/hooks/use-online-booking-settings";
import { useOnlineBookingSettingsMutations } from "@/features/online-booking-settings/hooks/use-online-booking-settings-mutations";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

export function StaffSelectionSettingsScreen() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } = useOnlineBookingSettings();
  const { staffSelectionMutation, isSaving } =
    useOnlineBookingSettingsMutations();

  if (isLoading) {
    return <LoadingState label="Loading staff selection settings…" />;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Could not load staff selection settings"}
      </p>
    );
  }

  return (
    <SettingsFormPage
      title="Staff Selection"
      description="Adjust staff selection options in online booking."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <SettingsToggleSection
          id="randomize-staff-order"
          title="Randomize staff order"
          description="When enabled, the order that staff members appear on the staff selection screen of online booking will be randomized."
          checked={data.randomizeStaffOrder}
          onCheckedChange={(checked) =>
            staffSelectionMutation.mutate({ randomizeStaffOrder: checked })
          }
          disabled={!canEdit || isSaving}
        />

        <SettingsToggleSection
          id="show-gender-options"
          title="Show gender options"
          description={`When enabled, clients will have the option to select "Female Only" or "Male Only" on the staff selection screen of online booking.`}
          checked={data.showGenderOptions}
          onCheckedChange={(checked) =>
            staffSelectionMutation.mutate({ showGenderOptions: checked })
          }
          disabled={!canEdit || isSaving}
        />

        <SettingsToggleSection
          id="show-anyone-option"
          title={`Show "Anyone" option`}
          description={`When enabled, an "Anyone" option will appear on the staff selection screen of online booking.`}
          checked={data.showAnyoneOption}
          onCheckedChange={(checked) =>
            staffSelectionMutation.mutate({ showAnyoneOption: checked })
          }
          disabled={!canEdit || isSaving}
        />

        <AnyoneAssignmentsSection
          data={data}
          disabled={!canEdit}
          isSaving={isSaving}
          onSave={(body) => staffSelectionMutation.mutate(body)}
        />
      </div>
    </SettingsFormPage>
  );
}
