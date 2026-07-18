import { normalizeE164Phone } from '@app/core/config/twilio/twilio.config';
import {
  BUSINESS_SMS_METADATA_TYPE,
  PLATFORM_SMS_METADATA_TYPE,
  PLATFORM_SMS_RESOURCE_EXTERNAL_ID,
  SMS_PROVIDER_KEY,
} from '@app/modules/communications/sms/constants/sms-platform.constants';
import type { IntegrationResource } from '@prisma/client';

export type SmsSendMode = 'platform' | 'business';

export function isPlatformSmsResource(
  resource: Pick<IntegrationResource, 'externalId' | 'metadata'> | null,
): boolean {
  if (!resource) return false;
  if (resource.externalId === PLATFORM_SMS_RESOURCE_EXTERNAL_ID) return true;
  const metadata = (resource.metadata ?? {}) as Record<string, unknown>;
  return metadata.type === PLATFORM_SMS_METADATA_TYPE;
}

export function isBusinessOwnedSmsResource(
  resource: Pick<IntegrationResource, 'metadata'> | null,
): boolean {
  if (!resource) return false;
  const metadata = (resource.metadata ?? {}) as Record<string, unknown>;
  return metadata.type === BUSINESS_SMS_METADATA_TYPE;
}

export function readSmsResourceFromNumber(
  resource: Pick<IntegrationResource, 'externalId' | 'metadata'> | null,
  platformFromNumber: string | null,
): string | null {
  if (!resource) return null;
  if (isPlatformSmsResource(resource)) {
    return platformFromNumber;
  }
  const metadata = (resource.metadata ?? {}) as Record<string, unknown>;
  const fromNumber =
    typeof metadata.fromNumber === 'string'
      ? metadata.fromNumber
      : resource.externalId;
  return normalizeE164Phone(fromNumber);
}

export function smsProviderKey(): string {
  return SMS_PROVIDER_KEY;
}
