import {
  IntegrationCategory,
  IntegrationConnectionType,
  IntegrationProvider,
  Prisma,
} from '@prisma/client';
import {
  BusinessIntegrationResponseDto,
  BusinessIntegrationSummaryDto,
  IntegrationProviderResponseDto,
  IntegrationProviderWithStatusDto,
  PlatformIntegrationProviderWithStatusDto,
  PlatformIntegrationResponseDto,
  PlatformIntegrationSummaryDto,
} from '../dto/integration.dto';
import { BusinessIntegrationWithProvider } from '../repositories/business-integration.repository';
import { PlatformIntegrationWithProvider } from '../repositories/platform-integration.repository';
import { sanitizeConfigForResponse } from '../utils/sanitize-integration.util';

export function toIntegrationProviderResponse(
  provider: Pick<
    IntegrationProvider,
    | 'id'
    | 'key'
    | 'name'
    | 'description'
    | 'category'
    | 'logoUrl'
    | 'isPlatformLevel'
    | 'isBusinessLevel'
    | 'isActive'
    | 'sortOrder'
    | 'connectionType'
  >,
): IntegrationProviderResponseDto {
  return {
    id: provider.id,
    key: provider.key,
    name: provider.name,
    description: provider.description,
    category: provider.category,
    logoUrl: provider.logoUrl,
    isPlatformLevel: provider.isPlatformLevel,
    isBusinessLevel: provider.isBusinessLevel,
    isActive: provider.isActive,
    sortOrder: provider.sortOrder,
    connectionType: provider.connectionType,
  };
}

function toIntegrationSummary(integration: {
  status: string;
  connectedAccountName: string | null;
  connectedAccountEmail: string | null;
  lastSyncAt: Date | null;
  errorMessage: string | null;
  connectedAt: Date | null;
}): BusinessIntegrationSummaryDto {
  return {
    status: integration.status as BusinessIntegrationSummaryDto['status'],
    connectedAccountName: integration.connectedAccountName,
    connectedAccountEmail: integration.connectedAccountEmail,
    lastSyncAt: integration.lastSyncAt,
    errorMessage: integration.errorMessage,
    connectedAt: integration.connectedAt,
  };
}

function parseConfig(
  config: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (config === null || config === undefined) return null;
  if (typeof config === 'object' && !Array.isArray(config)) {
    return config;
  }
  return null;
}

export function toBusinessIntegrationResponse(
  integration: BusinessIntegrationWithProvider,
): BusinessIntegrationResponseDto {
  return {
    id: integration.id,
    businessId: integration.businessId,
    providerKey: integration.providerKey,
    status: integration.status,
    config: sanitizeConfigForResponse(parseConfig(integration.config)),
    connectedAccountName: integration.connectedAccountName,
    connectedAccountEmail: integration.connectedAccountEmail,
    lastSyncAt: integration.lastSyncAt,
    errorMessage: integration.errorMessage,
    connectedAt: integration.connectedAt,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
    provider: toIntegrationProviderResponse(integration.provider),
  };
}

export function toPlatformIntegrationResponse(
  integration: PlatformIntegrationWithProvider,
): PlatformIntegrationResponseDto {
  return {
    id: integration.id,
    providerKey: integration.providerKey,
    status: integration.status,
    config: sanitizeConfigForResponse(parseConfig(integration.config)),
    connectedAccountName: integration.connectedAccountName,
    connectedAccountEmail: integration.connectedAccountEmail,
    lastSyncAt: integration.lastSyncAt,
    errorMessage: integration.errorMessage,
    connectedAt: integration.connectedAt,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
    provider: toIntegrationProviderResponse(integration.provider),
  };
}

export function toBusinessProviderWithStatus(
  provider: IntegrationProvider,
  integration: BusinessIntegrationWithProvider | null | undefined,
): IntegrationProviderWithStatusDto {
  return {
    ...toIntegrationProviderResponse(provider),
    status: integration?.status ?? 'NOT_CONNECTED',
    integration: integration ? toIntegrationSummary(integration) : null,
  };
}

export function toPlatformProviderWithStatus(
  provider: IntegrationProvider,
  integration: PlatformIntegrationWithProvider | null | undefined,
): PlatformIntegrationProviderWithStatusDto {
  const summary: PlatformIntegrationSummaryDto | null = integration
    ? {
        status: integration.status,
        connectedAccountName: integration.connectedAccountName,
        connectedAccountEmail: integration.connectedAccountEmail,
        lastSyncAt: integration.lastSyncAt,
        errorMessage: integration.errorMessage,
        connectedAt: integration.connectedAt,
      }
    : null;

  return {
    ...toIntegrationProviderResponse(provider),
    status: integration?.status ?? 'NOT_CONNECTED',
    integration: summary,
  };
}
