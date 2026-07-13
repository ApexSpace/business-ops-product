"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getMaxBookingPhotos,
  uploadAndAttachBookingPhotos,
} from "@/features/public-booking/utils/booking-photo-upload.util";
import { cn } from "@/lib/utils";

interface BookingSuccessPhotoUploadProps {
  slug: string;
  appointmentId: string;
  uploadToken: string;
  prompt?: string | null;
  accentColor: string;
}

type PreviewItem = {
  id: string;
  url: string;
  name: string;
};

export function BookingSuccessPhotoUpload({
  slug,
  appointmentId,
  uploadToken,
  prompt,
  accentColor,
}: BookingSuccessPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [attachedCount, setAttachedCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const maxPhotos = getMaxBookingPhotos();
  const remaining = maxPhotos - attachedCount;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || remaining <= 0 || uploading) return;
    const files = Array.from(fileList).slice(0, remaining);
    setUploading(true);
    try {
      const localPreviews = files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file),
        name: file.name,
      }));
      setPreviews((prev) => [...prev, ...localPreviews].slice(0, maxPhotos));

      const photoFileIds = await uploadAndAttachBookingPhotos({
        slug,
        appointmentId,
        uploadToken,
        files,
        alreadyAttached: attachedCount,
      });
      setAttachedCount(photoFileIds.length);
      toast.success(
        photoFileIds.length === 1
          ? "Photo uploaded"
          : `${files.length} photo${files.length === 1 ? "" : "s"} uploaded`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setPreviews((prev) => prev.slice(0, attachedCount));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-8 border-t border-border/70 pt-6 text-left">
      <h3 className="text-base font-semibold tracking-tight">
        Upload photos (optional)
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {prompt?.trim() ||
          "Please share any reference or inspiration photos that are relevant to your appointment."}
      </p>

      {previews.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {previews.map((item) => (
            <div
              key={item.id}
              className="relative size-20 overflow-hidden rounded-lg border bg-muted/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.name}
                className="size-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <Button
        type="button"
        variant="outline"
        className={cn(
          "mt-4 h-11 w-full gap-2 rounded-[10px] border-[1.5px] text-[14px] font-medium",
          remaining <= 0 && "opacity-60",
        )}
        style={{ borderColor: `${accentColor}55` }}
        disabled={uploading || remaining <= 0}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImagePlus className="size-4" />
        )}
        {uploading
          ? "Uploading…"
          : remaining <= 0
            ? "3 photos uploaded"
            : "Upload photos (3 max)"}
      </Button>
    </div>
  );
}
