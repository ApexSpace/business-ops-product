"use client";

import { useEffect, useRef, useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Camera, Loader2, Upload, User } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { displayInitials } from "@/lib/ui/display-initials";
import {
  StorageUploadError,
  useFileDownloadUrl,
  useStorageUpload,
  validateFileForUpload,
} from "@/lib/storage";

const MAX_SIZE_MB = 0.5;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

type AvatarUploadControlProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  fallbackPreviewUrl?: string | null;
  layout?: "inline" | "dropzone";
  displayName?: string;
};

function AvatarUploadControl({
  value,
  onChange,
  disabled,
  fallbackPreviewUrl,
  layout = "inline",
  displayName,
}: AvatarUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [, setPreviewVersion] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { uploadFile, isUploading } = useStorageUpload();
  const { data: downloadData } = useFileDownloadUrl(value, { enabled: !!value });

  useEffect(() => {
    if (!downloadData?.downloadUrl || !localPreviewRef.current) {
      return;
    }
    URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = null;
  }, [downloadData?.downloadUrl]);

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
      }
    };
  }, []);

  const previewUrl =
    downloadData?.downloadUrl ??
    localPreviewRef.current ??
    (value ? null : fallbackPreviewUrl) ??
    null;

  const initials = displayInitials(displayName ?? "");

  const processFile = async (file: File) => {
    try {
      validateFileForUpload({
        file,
        maxSizeMb: MAX_SIZE_MB,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      });
    } catch (err) {
      toast.error(
        err instanceof StorageUploadError ? err.message : "Invalid image",
      );
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    localPreviewRef.current = objectUrl;
    setPreviewVersion((v) => v + 1);

    try {
      const asset = await uploadFile({
        file,
        visibility: "PRIVATE",
        maxSizeMb: MAX_SIZE_MB,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      });
      onChange(asset.id);
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      localPreviewRef.current = null;
      setPreviewVersion((v) => v + 1);
      toast.error(
        err instanceof StorageUploadError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Upload failed",
      );
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const fileInput = (
    <FormControl>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleInputChange}
      />
    </FormControl>
  );

  if (layout === "dropzone") {
    return (
      <div className="space-y-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          {fileInput}
          <div className="relative mx-auto shrink-0 sm:mx-0">
          <div
            className={cn(
              "flex size-20 items-center justify-center overflow-hidden rounded-full border-2 border-primary/15 bg-primary/10 text-lg font-semibold text-primary",
            )}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="size-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label="Upload photo"
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Camera className="size-3.5" />
            )}
          </button>
        </div>

        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !isUploading) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-[5.5rem] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-4 text-center transition-colors",
            isDragOver
              ? "border-primary/50 bg-primary/5"
              : "border-border/80 bg-muted/20 hover:border-primary/30 hover:bg-muted/35",
            (disabled || isUploading) && "pointer-events-none opacity-60",
          )}
        >
          <Upload className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {isUploading ? "Uploading…" : "Drag a photo here or click to upload"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG, or WebP · up to 512 KB
          </span>
        </button>
        </div>

        {previewUrl ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => {
                if (localPreviewRef.current) {
                  URL.revokeObjectURL(localPreviewRef.current);
                  localPreviewRef.current = null;
                  setPreviewVersion((v) => v + 1);
                }
                onChange("");
              }}
            >
              Remove photo
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {fileInput}
      <div
        className={cn(
          "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted",
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : (
          <User className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Uploading…
              </>
            ) : (
              "Upload photo"
            )}
          </Button>
          {previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => {
                if (localPreviewRef.current) {
                  URL.revokeObjectURL(localPreviewRef.current);
                  localPreviewRef.current = null;
                  setPreviewVersion((v) => v + 1);
                }
                onChange("");
              }}
            >
              Remove
            </Button>
          ) : null}
        </div>
        <FormDescription>JPG, PNG, or WebP up to 512 KB.</FormDescription>
      </div>
    </div>
  );
}

export interface AvatarUploadFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  disabled?: boolean;
  fallbackPreviewUrl?: string | null;
  layout?: "inline" | "dropzone";
  displayName?: string;
  hideLabel?: boolean;
}

export function AvatarUploadField<T extends FieldValues>({
  control,
  name,
  label = "Profile picture",
  disabled,
  fallbackPreviewUrl,
  layout = "inline",
  displayName,
  hideLabel = false,
}: AvatarUploadFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {hideLabel ? null : <FormLabel>{label}</FormLabel>}
          <AvatarUploadControl
            value={typeof field.value === "string" ? field.value : ""}
            onChange={field.onChange}
            disabled={disabled}
            fallbackPreviewUrl={fallbackPreviewUrl}
            layout={layout}
            displayName={displayName}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
