"use client";

import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileDownloadUrl } from "@/lib/storage";
import { usePublicFormFileDownloadUrl } from "@/features/forms/hooks/use-public-form-file-download-url";

interface FormImageDisplayProps {
  fileAssetId?: string;
  src?: string;
  alt: string;
  publicKey?: string;
  className?: string;
  tall?: boolean;
}

export function FormImageDisplay({
  fileAssetId,
  src,
  alt,
  publicKey,
  className,
  tall = false,
}: FormImageDisplayProps) {
  const authDownload = useFileDownloadUrl(fileAssetId ?? "", {
    enabled: !!fileAssetId && !publicKey,
  });
  const publicDownload = usePublicFormFileDownloadUrl(publicKey, fileAssetId ?? "", {
    enabled: !!fileAssetId && !!publicKey,
  });

  const resolvedSrc =
    (publicKey ? publicDownload.data?.downloadUrl : authDownload.data?.downloadUrl) ??
    src ??
    null;

  if (!resolvedSrc) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-dashed bg-muted/30",
          tall ? "min-h-48" : "h-32",
          className,
        )}
      >
        <ImageIcon className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className={cn(
        "w-full rounded-md object-cover",
        tall ? "max-h-80 object-contain" : "max-h-48",
        className,
      )}
    />
  );
}
