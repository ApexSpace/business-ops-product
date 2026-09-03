"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  ExpressDepositFields,
  expressDepositFieldsFromSettings,
  expressDepositFieldsToPreferences,
  type ExpressDepositFieldsValue,
} from "@/features/express-booking/components/express-deposit-fields";
import { updateExpressBookingPreferences } from "@/features/express-booking/api/express-booking-settings.api";
import { useExpressBookingSettings } from "@/features/express-booking/hooks/use-express-booking-settings";
import {
  EXPRESS_TIME_LIMIT_OPTIONS,
  formatExpressDefaultSettingsSummary,
  formatExpressPhotosSummary,
  formatExpressTimeLimitLabel,
} from "@/features/express-booking/utils/express-booking-settings-labels";
import { invalidateOnlineBookingSettings } from "@/lib/query/invalidation";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";
import { useSettingsSectionState } from "@/lib/settings/use-settings-section-state";

type DefaultSettingsDraft = {
  expressBookingAutoEnable: boolean;
  expressBookingTimeLimitMinutes: number;
  depositFields: ExpressDepositFieldsValue;
};

type PhotosSettingsDraft = {
  expressAllowPhotoUpload: boolean;
  photoUploadPrompt: string;
};

export function ExpressBookingSettings() {
  const queryClient = useQueryClient();
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } = useExpressBookingSettings();
  const { isEditing, startEdit, stopEdit } = useSettingsSectionEdit<
    "defaults" | "photos"
  >();

  const enablePick = useCallback(
    (settings: NonNullable<typeof data>) => ({
      expressBookingEnabled: settings.expressBookingEnabled,
    }),
    [],
  );
  const defaultPick = useCallback(
    (settings: NonNullable<typeof data>): DefaultSettingsDraft => ({
      expressBookingAutoEnable: settings.expressBookingAutoEnable,
      expressBookingTimeLimitMinutes: settings.expressBookingTimeLimitMinutes,
      depositFields: expressDepositFieldsFromSettings(settings),
    }),
    [],
  );
  const photosPick = useCallback(
    (settings: NonNullable<typeof data>): PhotosSettingsDraft => ({
      expressAllowPhotoUpload: settings.expressAllowPhotoUpload,
      photoUploadPrompt: settings.photoUploadPrompt ?? "",
    }),
    [],
  );

  const enableSection = useSettingsSectionState(data, enablePick);
  const defaultSection = useSettingsSectionState(data, defaultPick);
  const photosSection = useSettingsSectionState(data, photosPick);

  const mutation = useMutation({
    mutationFn: updateExpressBookingPreferences,
    onSuccess: async () => {
      await invalidateOnlineBookingSettings(queryClient);
      toast.success("Express Booking settings saved");
      stopEdit();
      defaultSection.reset();
      photosSection.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const defaultSummary = useMemo(() => {
    if (!data) return "";
    return formatExpressDefaultSettingsSummary(data);
  }, [data]);

  const photosSummary = useMemo(() => {
    if (!data) return "";
    return formatExpressPhotosSummary(data);
  }, [data]);

  if (isLoading) {
    return <LoadingState label="Loading Express Booking settings…" />;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Could not load Express Booking settings"}
      </p>
    );
  }

  const defaults = defaultSection.values;
  const photos = photosSection.values;

  return (
    <SettingsFormPage
      title="Express Booking™"
      description="Configure staff-started bookings that clients complete via a secure link — time limits, payment, and photo collection."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <SettingsToggleSection
          id="express-booking-enabled"
          title="Enable Express Booking™"
          description={
            <>
              Let staff create pending appointments and send clients a link to
              confirm details, pay a deposit, and upload photos. Expired links
              cancel automatically.
            </>
          }
          checked={enableSection.values?.expressBookingEnabled ?? false}
          onCheckedChange={(checked) =>
            enableSection.commit({ expressBookingEnabled: checked })
          }
          onDiscard={enableSection.reset}
          onSave={() =>
            mutation.mutate({
              expressBookingEnabled:
                enableSection.values?.expressBookingEnabled,
            })
          }
          isDirty={enableSection.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />

        {enableSection.values?.expressBookingEnabled ? (
          <>
            <SettingsInlineEditSection
              title="Default settings"
              description={
                <>
                  Defaults applied to new Express Booking appointments. Delivery
                  channel is configured under{" "}
                  <Link
                    href="/business/settings/notifications"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Notifications
                  </Link>
                  .
                </>
              }
              summary={
                <SettingsViewRows
                  rows={[{ label: "Current settings", value: defaultSummary }]}
                />
              }
              isEditing={isEditing("defaults")}
              onEdit={() => startEdit("defaults")}
              onDiscard={() => {
                defaultSection.reset();
                stopEdit();
              }}
              onSave={() => {
                if (!defaults) return;
                mutation.mutate({
                  expressBookingAutoEnable: defaults.expressBookingAutoEnable,
                  expressBookingTimeLimitMinutes:
                    defaults.expressBookingTimeLimitMinutes,
                  ...expressDepositFieldsToPreferences(defaults.depositFields),
                });
              }}
              isDirty={defaultSection.isDirty}
              isSaving={mutation.isPending}
              disabled={!canEdit}
            >
              {defaults ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="express-auto-enable">
                      Automatically enable for new appointments
                    </Label>
                    <Switch
                      id="express-auto-enable"
                      checked={defaults.expressBookingAutoEnable}
                      disabled={!canEdit}
                      onCheckedChange={(checked) =>
                        defaultSection.commit({
                          ...defaults,
                          expressBookingAutoEnable: checked,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Time limit</Label>
                    <Select
                      value={String(defaults.expressBookingTimeLimitMinutes)}
                      onValueChange={(value) => {
                        if (!value) return;
                        defaultSection.commit({
                          ...defaults,
                          expressBookingTimeLimitMinutes: Number(value),
                        });
                      }}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPRESS_TIME_LIMIT_OPTIONS.map((minutes) => (
                          <SelectItem key={minutes} value={String(minutes)}>
                            {formatExpressTimeLimitLabel(minutes)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <ExpressDepositFields
                    value={defaults.depositFields}
                    disabled={!canEdit}
                    onChange={(depositFields) =>
                      defaultSection.commit({ ...defaults, depositFields })
                    }
                  />
                </div>
              ) : null}
            </SettingsInlineEditSection>

            <SettingsInlineEditSection
              title="Collect photos"
              description="Let clients upload reference photos after completing Express Booking."
              summary={
                <SettingsViewRows
                  rows={[{ label: "Current settings", value: photosSummary }]}
                />
              }
              isEditing={isEditing("photos")}
              onEdit={() => startEdit("photos")}
              onDiscard={() => {
                photosSection.reset();
                stopEdit();
              }}
              onSave={() => {
                if (!photos) return;
                mutation.mutate({
                  expressAllowPhotoUpload: photos.expressAllowPhotoUpload,
                  photoUploadPrompt: photos.photoUploadPrompt.trim() || null,
                });
              }}
              isDirty={photosSection.isDirty}
              isSaving={mutation.isPending}
              disabled={!canEdit}
            >
              {photos ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="express-allow-photo-upload">Enable</Label>
                    <Switch
                      id="express-allow-photo-upload"
                      checked={photos.expressAllowPhotoUpload}
                      disabled={!canEdit}
                      onCheckedChange={(checked) =>
                        photosSection.commit({
                          ...photos,
                          expressAllowPhotoUpload: checked,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="express-photo-prompt">
                      Photo upload prompt
                    </Label>
                    <Textarea
                      id="express-photo-prompt"
                      rows={4}
                      value={photos.photoUploadPrompt}
                      disabled={!canEdit || !photos.expressAllowPhotoUpload}
                      placeholder="Please share any reference or inspiration photos that are relevant to your appointment."
                      onChange={(e) =>
                        photosSection.commit({
                          ...photos,
                          photoUploadPrompt: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              ) : null}
            </SettingsInlineEditSection>
          </>
        ) : null}
      </div>
    </SettingsFormPage>
  );
}
