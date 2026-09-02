"use client";

import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { AvoidGapsSection } from "@/features/online-booking-settings/components/sections/avoid-gaps-section";
import { BookingWindowSection } from "@/features/online-booking-settings/components/sections/booking-window-section";
import { CollectPhotosSection } from "@/features/online-booking-settings/components/sections/collect-photos-section";
import { useOnlineBookingSettings } from "@/features/online-booking-settings/hooks/use-online-booking-settings";
import { useOnlineBookingSettingsMutations } from "@/features/online-booking-settings/hooks/use-online-booking-settings-mutations";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

export function PreferencesSettingsScreen() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } = useOnlineBookingSettings();
  const { preferencesMutation, isSaving } = useOnlineBookingSettingsMutations();

  if (isLoading) {
    return <LoadingState label="Loading online booking preferences…" />;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Could not load online booking preferences"}
      </p>
    );
  }

  return (
    <SettingsFormPage
      title="Preferences"
      description="Set booking windows, gap avoidance, service rules, photos, and waitlist options for online booking."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <BookingWindowSection
          data={data}
          disabled={!canEdit}
          isSaving={isSaving}
          onSave={(body) => preferencesMutation.mutate(body)}
        />

        <AvoidGapsSection
          data={data}
          disabled={!canEdit}
          isSaving={isSaving}
          onSave={(body) => preferencesMutation.mutate(body)}
        />

        <SettingsToggleSection
          id="allow-multiple-services"
          title="Allow multiple services"
          description="Allow clients to book multiple services in a single appointment through online booking."
          checked={data.allowMultipleServices}
          onCheckedChange={(checked) =>
            preferencesMutation.mutate({ allowMultipleServices: checked })
          }
          disabled={!canEdit || isSaving}
        />

        <SettingsToggleSection
          id="allow-duplicate-services"
          title="Allow booking the same service multiple times"
          description="Allow clients to book the same service multiple times within a single appointment in online booking."
          checked={data.allowDuplicateServices}
          onCheckedChange={(checked) =>
            preferencesMutation.mutate({ allowDuplicateServices: checked })
          }
          disabled={!canEdit || isSaving}
        />

        <SettingsToggleSection
          id="single-staff-only"
          title="Only allow single staff member"
          description="When enabled, this only allows multiple-service bookings with a single staff member. Bookings where services are performed by different staff members are not allowed through online booking."
          checked={data.singleStaffOnly}
          onCheckedChange={(checked) =>
            preferencesMutation.mutate({ singleStaffOnly: checked })
          }
          disabled={!canEdit || isSaving}
        />

        <CollectPhotosSection
          data={data}
          disabled={!canEdit}
          isSaving={isSaving}
          onSave={(body) => preferencesMutation.mutate(body)}
        />

        <SettingsToggleSection
          id="waitlist-enabled"
          title="Allow clients to join waitlist"
          description={`When enabled, clients are given the option to join the waitlist when booking online. A "Join Waitlist" button will be displayed for dates without availability.`}
          checked={data.waitlistEnabled}
          onCheckedChange={(checked) =>
            preferencesMutation.mutate({ waitlistEnabled: checked })
          }
          disabled={!canEdit || isSaving}
        />
      </div>
    </SettingsFormPage>
  );
}
