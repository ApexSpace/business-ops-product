# Storage upload utility (`@/lib/storage`)

Shared infrastructure for uploading files through the backend Storage module and Cloudflare R2 signed URLs.

## Purpose

This shared storage upload layer handles the full signed-upload workflow. Feature modules should not manually call create upload, upload to signed URL, and confirm upload.

## Rule

```text
Feature UI passes File.
Upload utility returns FileAsset.
Feature stores fileAssetId.
```

## When to use

Use this utility for:

- contact attachments
- form file fields
- chatbot knowledge files
- invoice/estimate attachments
- business logo
- user avatar
- any future file upload

## React usage example

```tsx
import { useStorageUpload } from "@/lib/storage";

const { uploadFile, isUploading, progress } = useStorageUpload();

async function handleUpload(file: File) {
  const asset = await uploadFile({
    file,
    visibility: "PRIVATE",
    maxSizeMb: 10,
  });

  await saveFeatureRecord({
    fileAssetId: asset.id,
  });
}
```

## Non-React usage example

```ts
import { uploadFile } from "@/lib/storage";

const asset = await uploadFile({
  file,
  visibility: "PRIVATE",
});
```

## What not to do

```text
Do not call /storage/uploads directly from feature components.
Do not store signed URLs in feature records.
Do not store raw R2 URLs in feature records.
Do not duplicate upload flow inside feature modules.
Do not create feature-specific upload helpers unless they only wrap this shared utility.
```

## Correct pattern

```text
Feature component
→ useStorageUpload()
→ uploadFile()
→ FileAsset
→ feature saves fileAssetId
```

## Error handling

Upload failures throw `StorageUploadError` with a stable `code`:

| Code | Meaning |
| --- | --- |
| `VALIDATION_FAILED` | Client-side size, MIME, or extension validation failed |
| `CREATE_UPLOAD_FAILED` | Backend rejected the upload intent request |
| `SIGNED_UPLOAD_FAILED` | Direct PUT to the signed R2 URL failed |
| `CONFIRM_UPLOAD_FAILED` | Backend could not confirm the uploaded object |
| `FAIL_UPLOAD_FAILED` | Marking a pending upload as failed on the backend failed |
| `UNKNOWN` | Unexpected error |

If a `FileAsset` was created but a later step fails, the service attempts to call `failUpload` with `"Frontend upload failed"` before rethrowing the original normalized error.

## Progress handling

Pass `onProgress` to `uploadFile` or use the `progress` state from `useStorageUpload()`:

```ts
onProgress: ({ loaded, total, percent }) => {
  // update UI
};
```

Progress is tracked via `XMLHttpRequest` during the signed URL PUT step.

## Visibility

- `PRIVATE` — default; files require authenticated access and signed download URLs.
- `PUBLIC` — reserved for assets that should be publicly accessible later.
- `SIGNED` — use when the backend stores files that are always served via signed URLs.

## Limitations

- No reusable UI component in this phase
- No image compression
- No file preview
- No public CDN handling
- No feature integration yet (Forms, Contacts, Chatbots, etc.)

## API surface

| Export | Description |
| --- | --- |
| `uploadFile` | Full orchestration service (validate → create → PUT → confirm) |
| `useStorageUpload` | React hook with `isUploading`, `progress`, `error`, `reset` |
| `useFileDownloadUrl` | TanStack Query hook for signed download URLs |
| `useDeleteFileAsset` | Mutation hook that soft-deletes a file asset |
| `createUpload`, `confirmUpload`, `failUpload`, `getFileAsset`, `getFileDownloadUrl`, `deleteFileAsset` | Thin API adapters |
| `validateFileForUpload`, `detectFileCategory`, `formatFileSize` | Pure helpers |
| `StorageUploadError`, `normalizeUploadError` | Error normalization |
