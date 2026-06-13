import {
  IntegrationResource,
  IntegrationResourceType,
} from '@prisma/client';
import {
  WhatsAppNumberResponseDto,
  WhatsAppOverviewResponseDto,
} from '../dto/whatsapp-numbers.dto';

const WHATSAPP_PROVIDER_KEY = 'whatsapp';

function readMetadataString(
  metadata: unknown,
  key: string,
): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function mapWhatsAppNumberResponse(
  resource: IntegrationResource,
): WhatsAppNumberResponseDto {
  const metadata = resource.metadata;
  const displayPhone =
    readMetadataString(metadata, 'displayPhoneNumber') ?? resource.name;

  return {
    id: resource.id,
    phoneNumber: displayPhone,
    displayName:
      readMetadataString(metadata, 'verifiedName') ?? resource.name,
    messagingLimit: readMetadataString(metadata, 'messagingLimit'),
    qualityRating: readMetadataString(metadata, 'qualityRating'),
    status: resource.status,
    lastSyncedAt: resource.lastSyncedAt,
    wabaId: readMetadataString(metadata, 'wabaId'),
    wabaName: readMetadataString(metadata, 'wabaName'),
    isDefault: resource.isDefault,
  };
}

export function buildWhatsAppOverview(
  connected: boolean,
  integration: {
    status: string;
    connectedAccountName: string | null;
  } | null,
  primaryNumber: IntegrationResource | null,
): WhatsAppOverviewResponseDto {
  if (!connected || !integration) {
    return { connected: false };
  }

  const mapped = primaryNumber
    ? mapWhatsAppNumberResponse(primaryNumber)
    : null;

  return {
    connected: true,
    integrationStatus: integration.status,
    connectedAccountName: integration.connectedAccountName,
    wabaId: mapped?.wabaId ?? null,
    wabaName: mapped?.wabaName ?? null,
    defaultPhoneNumber: mapped?.phoneNumber ?? null,
    defaultNumber: mapped,
  };
}

export function isWhatsAppPhoneResource(resource: IntegrationResource): boolean {
  return (
    resource.providerKey === WHATSAPP_PROVIDER_KEY &&
    resource.type === IntegrationResourceType.PHONE_NUMBER
  );
}
