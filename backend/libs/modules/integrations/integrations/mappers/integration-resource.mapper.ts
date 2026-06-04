import { IntegrationResource } from '@prisma/client';
import { IntegrationResourceResponseDto } from '../dto/integration-resource.dto';
import { sanitizeResourceMetadata } from '../utils/sanitize-integration.util';

export function toIntegrationResourceResponse(
  resource: IntegrationResource,
): IntegrationResourceResponseDto {
  return {
    id: resource.id,
    businessIntegrationId: resource.businessIntegrationId,
    businessId: resource.businessId,
    providerKey: resource.providerKey,
    externalId: resource.externalId,
    name: resource.name,
    type: resource.type,
    metadata: sanitizeResourceMetadata(
      (resource.metadata as Record<string, unknown> | null) ?? null,
    ),
    isSelected: resource.isSelected,
    isDefault: resource.isDefault,
    status: resource.status,
    lastSyncedAt: resource.lastSyncedAt,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}
