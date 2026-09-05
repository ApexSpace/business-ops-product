"use client";

import { ExternalLink } from "lucide-react";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import { Button } from "@/components/ui/button";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { CopyField } from "@/features/online-booking-settings/components/shared/copy-field";
import { useOnlineBookingSettings } from "@/features/online-booking-settings/hooks/use-online-booking-settings";
import { useOnlineBookingSettingsMutations } from "@/features/online-booking-settings/hooks/use-online-booking-settings-mutations";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

export function SetupIntegrationSettingsScreen() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } = useOnlineBookingSettings();
  const { setupMutation } = useOnlineBookingSettingsMutations();

  if (isLoading) {
    return <LoadingState label="Loading online booking settings…" />;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Could not load online booking settings"}
      </p>
    );
  }

  return (
    <SettingsFormPage
      title="Setup & Integration"
      description="Online booking setup, booking links, and website integration."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <SettingsToggleSection
          id="online-booking-enabled"
          title="Online Booking"
          description="Allow clients to book appointments online."
          checked={data.onlineBookingEnabled}
          onCheckedChange={(enabled) =>
            setupMutation.mutate({ onlineBookingEnabled: enabled })
          }
          disabled={!canEdit}
        />

        {data.publicBookingUrl ? (
          <section className={SETTINGS_FORM_SECTION_STACK_CLASS}>
            <CopyField
              label="Shareable booking link"
              value={data.publicBookingUrl}
              copyLabel="Booking link"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => window.open(data.publicBookingUrl!, "_blank")}
            >
              <ExternalLink className="mr-1 size-4" />
              Open booking page
            </Button>
          </section>
        ) : null}

        <section className={SETTINGS_FORM_SECTION_STACK_CLASS}>
          <div className="space-y-1">
            <h3 className="text-base font-medium">Step 1</h3>
            <p className="text-sm text-muted-foreground">
              Add this code to your website (copy &amp; paste to HTML header):
            </p>
          </div>
          <SettingsToggleSection
            id="embed-enabled"
            title="Enable embed"
            description="Show the iframe embed snippet for your website."
            checked={data.embedEnabled}
            onCheckedChange={(embedEnabled) =>
              setupMutation.mutate({ embedEnabled })
            }
            disabled={!canEdit}
          />
          {data.embedEnabled && data.embedCode ? (
            <CopyField
              label="Embed code"
              value={data.embedCode}
              copyLabel="Embed code"
              multiline
            />
          ) : null}
        </section>

        <section className={SETTINGS_FORM_SECTION_STACK_CLASS}>
          <div className="space-y-1">
            <h3 className="text-base font-medium">Step 2</h3>
            <p className="text-sm text-muted-foreground">
              Use this link for any buttons or links that you would like to open
              in an overlay:
            </p>
          </div>
          <SettingsToggleSection
            id="overlay-enabled"
            title="Enable overlay link"
            description="Use the booking URL on site buttons that should open in an overlay."
            checked={data.overlayEnabled}
            onCheckedChange={(overlayEnabled) =>
              setupMutation.mutate({ overlayEnabled })
            }
            disabled={!canEdit}
          />
          {data.overlayUrl ? (
            <>
              <CopyField
                label="Overlay link"
                value={data.overlayUrl}
                copyLabel="Overlay link"
              />
              <p className="text-xs text-muted-foreground">
                Add your overlay script and use this URL on booking buttons.
              </p>
            </>
          ) : null}
        </section>
      </div>
    </SettingsFormPage>
  );
}
