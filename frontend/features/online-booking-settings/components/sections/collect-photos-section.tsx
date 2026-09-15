"use client";

import { useCallback, useEffect, useState } from "react";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { OnlineBookingSettings } from "@/features/online-booking-settings/api/online-booking-settings.api";
import { formatCollectPhotosSummary } from "@/features/online-booking-settings/utils/online-booking-settings-labels";

type CollectPhotosDraft = {
  collectPhotosEnabled: boolean;
  photoUploadPrompt: string;
};

type CollectPhotosSectionProps = {
  data: OnlineBookingSettings;
  disabled?: boolean;
  isSaving?: boolean;
  onSave: (
    body: {
      collectPhotosEnabled: boolean;
      photoUploadPrompt: string | null;
    },
    options?: { onSuccess?: () => void },
  ) => void;
};

function pickDraft(data: OnlineBookingSettings): CollectPhotosDraft {
  return {
    collectPhotosEnabled: data.collectPhotosEnabled,
    photoUploadPrompt: data.photoUploadPrompt ?? "",
  };
}

export function CollectPhotosSection({
  data,
  disabled,
  isSaving,
  onSave,
}: CollectPhotosSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CollectPhotosDraft>(() => pickDraft(data));
  const [saved, setSaved] = useState<CollectPhotosDraft>(() => pickDraft(data));

  useEffect(() => {
    const next = pickDraft(data);
    setSaved(next);
    if (!isEditing) setDraft(next);
  }, [data, isEditing]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const handleDiscard = useCallback(() => {
    setDraft(saved);
    setIsEditing(false);
  }, [saved]);

  return (
    <SettingsInlineEditSection
      title="Collect photos during booking"
      description="After a successful online booking, clients will be asked to upload up to 3 photos that are then attached to their appointment. This part is optional, and won't block clients from completing their booking."
      summary={
        <SettingsViewRows
          rows={[
            {
              label: "Collect photos",
              value: formatCollectPhotosSummary(saved),
            },
          ]}
        />
      }
      isEditing={isEditing}
      onEdit={() => {
        setDraft(saved);
        setIsEditing(true);
      }}
      onDiscard={handleDiscard}
      onSave={() =>
        onSave(
          {
            collectPhotosEnabled: draft.collectPhotosEnabled,
            photoUploadPrompt: draft.photoUploadPrompt.trim() || null,
          },
          {
            onSuccess: () => {
              setSaved(draft);
              setIsEditing(false);
            },
          },
        )
      }
      isDirty={isDirty}
      isSaving={isSaving}
      disabled={disabled}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="collect-photos-enabled">Enabled</Label>
          <Switch
            id="collect-photos-enabled"
            checked={draft.collectPhotosEnabled}
            disabled={disabled || isSaving}
            onCheckedChange={(checked) =>
              setDraft((current) => ({
                ...current,
                collectPhotosEnabled: checked,
              }))
            }
          />
        </div>
        {draft.collectPhotosEnabled ? (
          <div className="space-y-2">
            <Label htmlFor="photo-upload-prompt">Photo upload prompt</Label>
            <Textarea
              id="photo-upload-prompt"
              rows={4}
              value={draft.photoUploadPrompt}
              disabled={disabled || isSaving}
              placeholder="Please share any reference or inspiration photos that are relevant to your appointment."
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  photoUploadPrompt: e.target.value,
                }))
              }
            />
          </div>
        ) : null}
      </div>
    </SettingsInlineEditSection>
  );
}
