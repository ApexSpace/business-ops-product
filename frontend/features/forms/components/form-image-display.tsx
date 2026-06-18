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
}

export function FormImageDisplay({
  fileAssetId,
  src,
  alt,
  publicKey,
  className,
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
          "flex h-32 items-center justify-center rounded-md border border-dashed bg-muted/30",
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
      className={cn("max-h-48 w-full rounded-md object-cover", className)}
    />
  );
}
