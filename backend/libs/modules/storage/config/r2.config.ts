import type { R2Config } from '../types/storage.types';

export function resolveR2Config(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const bucket = env.R2_BUCKET?.trim();
  const endpoint = env.R2_ENDPOINT?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL?.trim() || undefined,
    signedUploadExpiresSeconds: parseInt(
      env.R2_SIGNED_UPLOAD_EXPIRES_SECONDS ?? '900',
      10,
    ),
    signedDownloadExpiresSeconds: parseInt(
      env.R2_SIGNED_DOWNLOAD_EXPIRES_SECONDS ?? '300',
      10,
    ),
  };
}

export function isR2Configured(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveR2Config(env) !== null;
}
