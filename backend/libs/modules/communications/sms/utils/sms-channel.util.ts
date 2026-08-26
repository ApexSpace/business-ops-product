import { normalizeE164Phone } from '@app/core/config/twilio/twilio.config';
import {
  BUSINESS_SMS_METADATA_TYPE,
  PLATFORM_PROVISIONED_SMS_METADATA_TYPE,
  PLATFORM_SMS_METADATA_TYPE,
  PLATFORM_SMS_RESOURCE_EXTERNAL_ID,
  SMS_PROVIDER_KEY,
} from '@app/modules/communications/sms/constants/sms-platform.constants';
import type { IntegrationResource } from '@prisma/client';

export type SmsSendMode = 'platform' | 'business';

function readMetadataType(
  resource: Pick<IntegrationResource, 'metadata'> | null,
): string | null {
  if (!resource) return null;
  const metadata = (resource.metadata ?? {}) as Record<string, unknown>;
  return typeof metadata.type === 'string' ? metadata.type : null;
}

export function isPlatformSharedSmsResource(
  resource: Pick<IntegrationResource, 'externalId' | 'metadata'> | null,
): boolean {
  if (!resource) return false;
  if (resource.externalId === PLATFORM_SMS_RESOURCE_EXTERNAL_ID) return true;
  return readMetadataType(resource) === PLATFORM_SMS_METADATA_TYPE;
}

export function isPlatformProvisionedSmsResource(
  resource: Pick<IntegrationResource, 'metadata'> | null,
): boolean {
  return readMetadataType(resource) === PLATFORM_PROVISIONED_SMS_METADATA_TYPE;
}

/** Shared env number OR per-business PandaCue-provisioned notification number. */
export function isPlatformSmsResource(
  resource: Pick<IntegrationResource, 'externalId' | 'metadata'> | null,
): boolean {
  return (
    isPlatformSharedSmsResource(resource) ||
    isPlatformProvisionedSmsResource(resource)
  );
}

export function isBusinessOwnedSmsResource(
  resource: Pick<IntegrationResource, 'metadata'> | null,
): boolean {
  return readMetadataType(resource) === BUSINESS_SMS_METADATA_TYPE;
}

export function isTwoWayEnabledSmsResource(
  resource: Pick<IntegrationResource, 'metadata'> | null,
): boolean {
  if (!resource) return false;
  if (isBusinessOwnedSmsResource(resource)) return true;
  const metadata = (resource.metadata ?? {}) as Record<string, unknown>;
  return metadata.twoWayEnabled === true;
}

/**
 * Outbound From for a resource. Provisioned numbers use metadata.fromNumber;
 * legacy PLATFORM_SHARED still maps to the env platform From.
 */
export function readSmsResourceFromNumber(
  resource: Pick<IntegrationResource, 'externalId' | 'metadata'> | null,
  platformFromNumber: string | null,
): string | null {
  if (!resource) return null;
  if (isPlatformSharedSmsResource(resource)) {
    return platformFromNumber ? normalizeE164Phone(platformFromNumber) : null;
  }
  const metadata = (resource.metadata ?? {}) as Record<string, unknown>;
  const fromNumber =
    typeof metadata.fromNumber === 'string'
      ? metadata.fromNumber
      : resource.externalId;
  const normalized = normalizeE164Phone(fromNumber);
  return normalized || null;
}

export function smsProviderKey(): string {
  return SMS_PROVIDER_KEY;
}
