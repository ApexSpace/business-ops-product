import { uploadFile, type FileAsset } from "@/lib/storage";

/** Social posts need publicly readable media URLs for platform publishers. */
export async function uploadSocialMediaFile(file: File): Promise<FileAsset> {
  return uploadFile({
    file,
    visibility: "PUBLIC",
  });
}
