"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  StorageUploadError,
  useFileDownloadUrl,
  validateFileForUpload,
} from "@/lib/storage";
import { usePublicFormFileDownloadUrl } from "@/features/forms/hooks/use-public-form-file-download-url";
import {
  DEFAULT_FORM_FILE_MAX_MB,
  FORM_IMAGE_ACCEPT,
  FORM_IMAGE_MIME_TYPES,
  parseAcceptAttribute,
} from "@/features/forms/utils/form-upload.util";
import { uploadFormFile } from "@/features/forms/utils/form-storage-upload.util";

interface FormFileUploadControlProps {
  value?: string;
  onChange?: (fileAssetId: string) => void;
  onClear?: () => void;
  accept?: string;
  maxSizeMb?: number;
  publicKey?: string;
  disabled?: boolean;
  variant?: "image" | "file";
  className?: string;
  inputName?: string;
  required?: boolean;
}

export function FormFileUploadControl({
  value = "",
  onChange,
  onClear,
  accept,
  maxSizeMb = DEFAULT_FORM_FILE_MAX_MB,
  publicKey,
  disabled = false,
  variant = "file",
  className,
  inputName,
  required,
}: FormFileUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [, setPreviewVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState("");
  const isControlled = onChange !== undefined;
  const currentValue = isControlled ? (value ?? "") : uncontrolledValue;

  const setCurrentValue = (next: string) => {
    if (!isControlled) {
      setUncontrolledValue(next);
    }
    onChange?.(next);
  };

  const authDownload = useFileDownloadUrl(currentValue, {
    enabled: !!currentValue && !publicKey,
  });
  const publicDownload = usePublicFormFileDownloadUrl(publicKey, currentValue, {
    enabled: !!currentValue && !!publicKey,
  });

  const downloadUrl =
    publicKey ? publicDownload.data?.downloadUrl : authDownload.data?.downloadUrl;

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!downloadUrl || !localPreviewRef.current) return;
    URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = null;
    setPreviewVersion((version) => version + 1);
  }, [downloadUrl]);

  const previewUrl = downloadUrl ?? localPreviewRef.current ?? null;
  const acceptAttr =
    accept ?? (variant === "image" ? FORM_IMAGE_ACCEPT : undefined);
  const validation = parseAcceptAttribute(acceptAttr);

  async function handleFileSelected(file: File) {
    try {
      validateFileForUpload({
        file,
        maxSizeMb,
        allowedMimeTypes:
          validation.allowedMimeTypes ??
          (variant === "image" ? FORM_IMAGE_MIME_TYPES : undefined),
        allowedExtensions: validation.allowedExtensions,
      });
    } catch (error) {
      toast.error(
        error instanceof StorageUploadError ? error.message : "Invalid file",
      );
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    localPreviewRef.current = objectUrl;
    setPreviewVersion((version) => version + 1);
    setIsUploading(true);

    try {
      const asset = await uploadFormFile({
        file,
        publicKey,
        visibility: "PRIVATE",
        maxSizeMb,
        allowedMimeTypes:
          validation.allowedMimeTypes ??
          (variant === "image" ? FORM_IMAGE_MIME_TYPES : undefined),
        allowedExtensions: validation.allowedExtensions,
      });
      setCurrentValue(asset.id);
    } catch (error) {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
        localPreviewRef.current = null;
        setPreviewVersion((version) => version + 1);
      }
      toast.error(
        error instanceof StorageUploadError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Upload failed",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleClear() {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
      setPreviewVersion((version) => version + 1);
    }
    onClear?.();
    setCurrentValue("");
  }

  return (
    <div className={cn("space-y-3", className)}>
      {inputName ? (
        <input
          type="hidden"
          name={inputName}
          value={currentValue}
          required={required}
        />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        disabled={disabled || isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFileSelected(file);
          }
          event.target.value = "";
        }}
      />

      {variant === "image" ? (
        <div className="overflow-hidden rounded-md border border-dashed bg-muted/20">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Uploaded preview"
              className="max-h-48 w-full object-cover"
            />
          ) : (
            <div className="flex h-32 items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground" />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-dashed px-4 py-6 text-center">
          <Upload className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {currentValue ? "File uploaded" : "Click to choose a file"}
          </p>
          {acceptAttr && acceptAttr !== FORM_IMAGE_ACCEPT ? (
            <p className="mt-1 text-xs text-muted-foreground">Accepts: {acceptAttr}</p>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
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
          ) : value ? (
            "Replace file"
          ) : (
            "Upload file"
          )}
        </Button>
        {currentValue ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isUploading}
            onClick={handleClear}
          >
            <X className="mr-1 size-4" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
