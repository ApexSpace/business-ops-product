"use client";

import { useEffect, useRef, useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Loader2, User } from "lucide-react";
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
};

function AvatarUploadControl({
  value,
  onChange,
  disabled,
  fallbackPreviewUrl,
}: AvatarUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [, setPreviewVersion] = useState(0);
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

  return (
    <div className="flex items-center gap-4">
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
        <FormControl>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={disabled || isUploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              try {
                validateFileForUpload({
                  file,
                  maxSizeMb: MAX_SIZE_MB,
                  allowedMimeTypes: ALLOWED_MIME_TYPES,
                });
              } catch (err) {
                toast.error(
                  err instanceof StorageUploadError
                    ? err.message
                    : "Invalid image",
                );
                e.target.value = "";
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
              } finally {
                e.target.value = "";
              }
            }}
          />
        </FormControl>
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
}

export function AvatarUploadField<T extends FieldValues>({
  control,
  name,
  label = "Profile picture",
  disabled,
  fallbackPreviewUrl,
}: AvatarUploadFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <AvatarUploadControl
            value={typeof field.value === "string" ? field.value : ""}
            onChange={field.onChange}
            disabled={disabled}
            fallbackPreviewUrl={fallbackPreviewUrl}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
