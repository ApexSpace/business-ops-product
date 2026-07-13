"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { getAppointmentPhotos } from "@/features/appointments/api/appointments.api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SECTION_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

interface AppointmentAttachedPhotosProps {
  appointmentId: string;
  hasPhotos?: boolean;
  className?: string;
}

export function AppointmentAttachedPhotos({
  appointmentId,
  hasPhotos = false,
  className,
}: AppointmentAttachedPhotosProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["appointment-photos", appointmentId],
    queryFn: () => getAppointmentPhotos(appointmentId),
    enabled: hasPhotos,
  });

  const items = data?.items ?? [];
  if (!hasPhotos) return null;

  return (
    <div className={cn("border-t border-border/60 pt-5", className)}>
      <p className={cn("mb-3", SECTION_LABEL_CLASS)}>Attached photos</p>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading photos…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos available.</p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {items.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className="size-20 overflow-hidden rounded-lg border border-border/80 bg-muted/30 transition hover:opacity-90"
              onClick={() => {
                setPreviewUrl(photo.downloadUrl);
                setPreviewName(photo.filename);
              }}
              aria-label={`View ${photo.filename}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.downloadUrl}
                alt={photo.filename}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(previewUrl)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewUrl(null);
            setPreviewName(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(92vw,720px)] gap-0 overflow-hidden border-none bg-transparent p-0 shadow-none"
        >
          <DialogTitle className="sr-only">
            {previewName ?? "Attached photo"}
          </DialogTitle>
          <div className="relative rounded-xl bg-black/90 p-2 sm:p-3">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
              aria-label="Close photo"
              onClick={() => {
                setPreviewUrl(null);
                setPreviewName(null);
              }}
            >
              <X className="size-4" />
            </button>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={previewName ?? "Attached photo"}
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
