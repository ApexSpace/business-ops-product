import { IntegrationResource } from '@prisma/client';
import { decryptIntegrationCredentials } from '../../../common/utils/integration-encryption.util';

export function getPageAccessTokenFromResource(
  resource: IntegrationResource,
  encryptionKey: string,
): string | null {
  const metadata = resource.metadata as Record<string, unknown> | null;
  const encrypted = metadata?.pageAccessTokenEncrypted as string | undefined;
  if (!encrypted) {
    return null;
  }

  const decrypted = decryptIntegrationCredentials(encryptionKey, encrypted) as {
    pageAccessToken?: string;
  };
  return decrypted.pageAccessToken ?? null;
}
