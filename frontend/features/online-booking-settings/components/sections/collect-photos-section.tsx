"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SettingsValueSection } from "@/components/layout/settings-value-section";
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
  onSave: (body: {
    collectPhotosEnabled: boolean;
    photoUploadPrompt: string | null;
  }) => void;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CollectPhotosDraft>(() => pickDraft(data));

  const openDialog = useCallback(() => {
    setDraft(pickDraft(data));
    setDialogOpen(true);
  }, [data]);

  return (
    <>
      <SettingsValueSection
        title="Collect photos during booking"
        description="After a successful online booking, clients will be asked to upload up to 3 photos that are then attached to their appointment. This part is optional, and won't block clients from completing their booking."
        valueLabel={formatCollectPhotosSummary(data)}
        onEdit={openDialog}
        disabled={disabled || isSaving}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect photos during booking</DialogTitle>
          </DialogHeader>
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={disabled || isSaving}
              onClick={() => {
                onSave({
                  collectPhotosEnabled: draft.collectPhotosEnabled,
                  photoUploadPrompt:
                    draft.photoUploadPrompt.trim() || null,
                });
                setDialogOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
