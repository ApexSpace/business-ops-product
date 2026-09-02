"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import { SettingsValueSection } from "@/components/layout/settings-value-section";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const [defaultDialogOpen, setDefaultDialogOpen] = useState(false);
  const [photosDialogOpen, setPhotosDialogOpen] = useState(false);
  const [dialogDefaults, setDialogDefaults] = useState<DefaultSettingsDraft | null>(
    null,
  );
  const [dialogPhotos, setDialogPhotos] = useState<PhotosSettingsDraft | null>(
    null,
  );

  const mutation = useMutation({
    mutationFn: updateExpressBookingPreferences,
    onSuccess: async () => {
      await invalidateOnlineBookingSettings(queryClient);
      toast.success("Express Booking settings saved");
      setDefaultDialogOpen(false);
      setPhotosDialogOpen(false);
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

  const saveSection = useCallback(
    (body: Parameters<typeof updateExpressBookingPreferences>[0]) => {
      mutation.mutate(body);
    },
    [mutation],
  );

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
            saveSection({
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
            <SettingsValueSection
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
              valueLabel={defaultSummary}
              onEdit={() => {
                if (defaultSection.values) {
                  setDialogDefaults(defaultSection.values);
                }
                setDefaultDialogOpen(true);
              }}
              onDiscard={defaultSection.reset}
              onSave={() => {
                if (!defaultSection.values) return;
                saveSection({
                  expressBookingAutoEnable:
                    defaultSection.values.expressBookingAutoEnable,
                  expressBookingTimeLimitMinutes:
                    defaultSection.values.expressBookingTimeLimitMinutes,
                  ...expressDepositFieldsToPreferences(
                    defaultSection.values.depositFields,
                  ),
                });
              }}
              isDirty={defaultSection.isDirty}
              isSaving={mutation.isPending}
              disabled={!canEdit}
            />

            <SettingsValueSection
              title="Collect photos"
              description="Let clients upload reference photos after completing Express Booking."
              valueLabel={photosSummary}
              onEdit={() => {
                if (photosSection.values) {
                  setDialogPhotos(photosSection.values);
                }
                setPhotosDialogOpen(true);
              }}
              onDiscard={photosSection.reset}
              onSave={() =>
                saveSection({
                  expressAllowPhotoUpload:
                    photosSection.values?.expressAllowPhotoUpload,
                  photoUploadPrompt:
                    photosSection.values?.photoUploadPrompt.trim() || null,
                })
              }
              isDirty={photosSection.isDirty}
              isSaving={mutation.isPending}
              disabled={!canEdit}
            />
          </>
        ) : null}
      </div>

      <Dialog open={defaultDialogOpen} onOpenChange={setDefaultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Default settings</DialogTitle>
          </DialogHeader>
          {dialogDefaults ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="express-auto-enable">
                  Automatically enable for new appointments
                </Label>
                <Switch
                  id="express-auto-enable"
                  checked={dialogDefaults.expressBookingAutoEnable}
                  disabled={!canEdit}
                  onCheckedChange={(checked) =>
                    setDialogDefaults({
                      ...dialogDefaults,
                      expressBookingAutoEnable: checked,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Time limit</Label>
                <Select
                  value={String(dialogDefaults.expressBookingTimeLimitMinutes)}
                  onValueChange={(value) =>
                    setDialogDefaults({
                      ...dialogDefaults,
                      expressBookingTimeLimitMinutes: Number(value),
                    })
                  }
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
                <p className="text-xs text-muted-foreground">
                  How long the client has to finish before the slot is released.
                  Policy version: {data.cancellationPolicyVersion || "1"}
                </p>
              </div>

              <ExpressDepositFields
                value={dialogDefaults.depositFields}
                disabled={!canEdit}
                onChange={(depositFields) =>
                  setDialogDefaults({ ...dialogDefaults, depositFields })
                }
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDefaultDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={!canEdit || mutation.isPending}
              onClick={() => {
                if (!dialogDefaults) return;
                defaultSection.commit(dialogDefaults);
                saveSection({
                  expressBookingAutoEnable:
                    dialogDefaults.expressBookingAutoEnable,
                  expressBookingTimeLimitMinutes:
                    dialogDefaults.expressBookingTimeLimitMinutes,
                  ...expressDepositFieldsToPreferences(
                    dialogDefaults.depositFields,
                  ),
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={photosDialogOpen} onOpenChange={setPhotosDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect photos</DialogTitle>
          </DialogHeader>
          {dialogPhotos ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="express-allow-photo-upload">Enable</Label>
                <Switch
                  id="express-allow-photo-upload"
                  checked={dialogPhotos.expressAllowPhotoUpload}
                  disabled={!canEdit}
                  onCheckedChange={(checked) =>
                    setDialogPhotos({
                      ...dialogPhotos,
                      expressAllowPhotoUpload: checked,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="express-photo-prompt">Photo upload prompt</Label>
                <Textarea
                  id="express-photo-prompt"
                  rows={4}
                  value={dialogPhotos.photoUploadPrompt}
                  disabled={!canEdit || !dialogPhotos.expressAllowPhotoUpload}
                  placeholder="Please share any reference or inspiration photos that are relevant to your appointment."
                  onChange={(e) =>
                    setDialogPhotos({
                      ...dialogPhotos,
                      photoUploadPrompt: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Shown after the client completes Express Booking. Clients can
                  upload up to 3 photos.
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPhotosDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={!canEdit || mutation.isPending}
              onClick={() => {
                if (!dialogPhotos) return;
                photosSection.commit(dialogPhotos);
                saveSection({
                  expressAllowPhotoUpload: dialogPhotos.expressAllowPhotoUpload,
                  photoUploadPrompt:
                    dialogPhotos.photoUploadPrompt.trim() || null,
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsFormPage>
  );
}
