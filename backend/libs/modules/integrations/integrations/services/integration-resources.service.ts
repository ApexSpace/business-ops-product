import { HttpStatus, Injectable } from '@nestjs/common';
import {
  IntegrationResource,
  IntegrationResourceType,
  IntegrationStatus,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { isMetaOAuthProviderKey } from '../meta/constants/meta-oauth.constants';
import {
  getProviderResourceConfig,
  providerSupportsResources,
  RESOURCE_SYNC_UNAVAILABLE_MESSAGE,
} from '../constants/integration-resource.constants';
import {
  IntegrationResourceResponseDto,
  IntegrationResourcesListResponseDto,
  SyncIntegrationResourcesResponseDto,
  UpdateIntegrationResourceDto,
} from '../dto/integration-resource.dto';
import { toIntegrationResourceResponse } from '../mappers/integration-resource.mapper';
import { IntegrationResourceSyncRegistry } from '../providers/resource-sync/integration-resource-sync.registry';
import { BusinessIntegrationRepository } from '../repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../repositories/integration-resource.repository';
import {
  assertSyncAllowed,
  recordSyncAttempt,
  SyncCooldownError,
} from '../utils/sync-cooldown.util';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';

@Injectable()
export class IntegrationResourcesService {
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly resourceRepository: IntegrationResourceRepository,
    private readonly syncRegistry: IntegrationResourceSyncRegistry,
    private readonly auditService: AuditService,
    private readonly jobEnqueueService: JobEnqueueService,
  ) {}

  async listResources(
    businessId: string,
    providerKey: string,
  ): Promise<IntegrationResourcesListResponseDto> {
    const integration = await this.assertConnectedIntegration(
      businessId,
      providerKey,
    );
    const config = getProviderResourceConfig(providerKey);

    const resources = await this.resourceRepository.findManyByIntegration(
      integration.id,
    );

    const allowedTypes = config?.resourceTypes ?? [];
    const filteredResources =
      allowedTypes.length > 0
        ? resources.filter((resource) =>
            allowedTypes.includes(resource.type),
          )
        : resources;

    return {
      resources: filteredResources.map(toIntegrationResourceResponse),
      providerKey,
      supportsResources: providerSupportsResources(providerKey),
      syncEnabled: config?.syncEnabled ?? false,
      resourceLabel: config?.label ?? null,
    };
  }

  /** HTTP: validate and enqueue — worker runs {@link executeSyncResources}. */
  async enqueueSyncResources(
    businessId: string,
    providerKey: string,
    actorUserId: string,
    idempotencyKey?: string,
  ) {
    await this.assertSyncEligible(businessId, providerKey);
    assertSyncAllowed(businessId, providerKey);
    recordSyncAttempt(businessId, providerKey);

    const asyncJob = await this.jobEnqueueService.enqueueIntegrationResourceSync(
      { businessId, providerKey, actorUserId, idempotencyKey },
    );

    return { asyncJob, providerKey };
  }

  private async assertSyncEligible(
    businessId: string,
    providerKey: string,
  ): Promise<void> {
    await this.assertConnectedIntegration(businessId, providerKey);

    if (!providerSupportsResources(providerKey)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This integration does not support resource sync',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!this.syncRegistry.getHandler(providerKey)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        RESOURCE_SYNC_UNAVAILABLE_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** Worker: full provider resource sync. */
  async executeSyncResources(
    businessId: string,
    providerKey: string,
    actorUserId?: string,
  ): Promise<SyncIntegrationResourcesResponseDto> {
    const integration = await this.assertConnectedIntegration(
      businessId,
      providerKey,
    );

    if (!providerSupportsResources(providerKey)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This integration does not support resource sync',
        HttpStatus.BAD_REQUEST,
      );
    }

    const handler = this.syncRegistry.getHandler(providerKey);

    if (!handler) {
      const existing = await this.resourceRepository.findManyByIntegration(
        integration.id,
      );
      return {
        resources: existing.map(toIntegrationResourceResponse),
        synced: false,
        message: RESOURCE_SYNC_UNAVAILABLE_MESSAGE,
      };
    }

    assertSyncAllowed(businessId, providerKey);
    recordSyncAttempt(businessId, providerKey);

    try {
      const result = await handler.sync({
        businessId,
        providerKey,
        businessIntegrationId: integration.id,
      });

      const now = new Date();
      let resources: IntegrationResource[] = [];

      if (result.items.length > 0) {
        resources = await this.resourceRepository.upsertMany(
          integration.id,
          businessId,
          providerKey,
          result.items,
        );
      } else {
        resources = await this.resourceRepository.findManyByIntegration(
          integration.id,
        );
      }

      await this.businessIntegrationRepository.update(businessId, providerKey, {
        lastSyncAt: now,
      });

      if (
        isMetaOAuthProviderKey(providerKey) &&
        result.synced &&
        actorUserId
      ) {
        await this.auditService.log({
          actorUserId,
          businessId,
          action: 'meta.resources.synced',
          entityType: 'BusinessIntegration',
          entityId: integration.id,
          metadata: {
            providerKey,
            resourceCount: resources.length,
          },
        });
      }

      return {
        resources: resources.map(toIntegrationResourceResponse),
        synced: result.synced,
        message: null,
      };
    } catch (error) {
      if (error instanceof SyncCooldownError) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          error.message,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const message =
        error instanceof Error ? error.message : 'Resource sync failed';
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateResource(
    businessId: string,
    providerKey: string,
    resourceId: string,
    dto: UpdateIntegrationResourceDto,
  ): Promise<IntegrationResourceResponseDto> {
    const integration = await this.assertConnectedIntegration(
      businessId,
      providerKey,
    );
    const resource = await this.assertResourceBelongsToIntegration(
      resourceId,
      businessId,
      integration.id,
    );

    if (dto.isDefault === true) {
      await this.resourceRepository.clearDefaultForType(
        integration.id,
        resource.type,
        resource.id,
      );
    }

    const updated = await this.resourceRepository.update(resource.id, {
      ...(dto.isSelected !== undefined ? { isSelected: dto.isSelected } : {}),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    await this.syncIntegrationConfig(businessId, providerKey, integration.id);

    return toIntegrationResourceResponse(updated);
  }

  async selectResource(
    businessId: string,
    providerKey: string,
    resourceId: string,
  ): Promise<IntegrationResourceResponseDto> {
    return this.updateResource(businessId, providerKey, resourceId, {
      isSelected: true,
    });
  }

  async unselectResource(
    businessId: string,
    providerKey: string,
    resourceId: string,
  ): Promise<IntegrationResourceResponseDto> {
    const integration = await this.assertConnectedIntegration(
      businessId,
      providerKey,
    );
    const resource = await this.assertResourceBelongsToIntegration(
      resourceId,
      businessId,
      integration.id,
    );

    const updated = await this.resourceRepository.update(resource.id, {
      isSelected: false,
      ...(resource.isDefault ? { isDefault: false } : {}),
    });

    await this.syncIntegrationConfig(businessId, providerKey, integration.id);

    return toIntegrationResourceResponse(updated);
  }

  async makeDefaultResource(
    businessId: string,
    providerKey: string,
    resourceId: string,
  ): Promise<IntegrationResourceResponseDto> {
    const integration = await this.assertConnectedIntegration(
      businessId,
      providerKey,
    );
    const resource = await this.assertResourceBelongsToIntegration(
      resourceId,
      businessId,
      integration.id,
    );

    await this.resourceRepository.clearDefaultForType(
      integration.id,
      resource.type,
      resource.id,
    );

    const updated = await this.resourceRepository.update(resource.id, {
      isDefault: true,
      isSelected: true,
    });

    await this.syncIntegrationConfig(businessId, providerKey, integration.id);

    return toIntegrationResourceResponse(updated);
  }

  async getDefaultResource(
    businessId: string,
    providerKey: string,
    resourceType: IntegrationResourceType,
  ): Promise<IntegrationResourceResponseDto | null> {
    const resource = await this.resourceRepository.findDefault(
      businessId,
      providerKey,
      resourceType,
    );
    return resource ? toIntegrationResourceResponse(resource) : null;
  }

  async getSelectedResources(
    businessId: string,
    providerKey: string,
    resourceType?: IntegrationResourceType,
  ): Promise<IntegrationResourceResponseDto[]> {
    const resources = await this.resourceRepository.findSelected(
      businessId,
      providerKey,
      resourceType,
    );
    return resources.map(toIntegrationResourceResponse);
  }

  private async assertConnectedIntegration(
    businessId: string,
    providerKey: string,
  ) {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        providerKey,
      );

    if (!integration) {
      throw new AppException(
        ErrorCode.INTEGRATION_NOT_FOUND,
        'Integration not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Integration must be connected to manage resources',
        HttpStatus.BAD_REQUEST,
      );
    }

    return integration;
  }

  private async assertResourceBelongsToIntegration(
    resourceId: string,
    businessId: string,
    businessIntegrationId: string,
  ): Promise<IntegrationResource> {
    const resource = await this.resourceRepository.findByIdAndBusiness(
      resourceId,
      businessId,
    );

    if (!resource || resource.businessIntegrationId !== businessIntegrationId) {
      throw new AppException(
        ErrorCode.INTEGRATION_RESOURCE_NOT_FOUND,
        'Integration resource not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return resource;
  }

  private async syncIntegrationConfig(
    businessId: string,
    providerKey: string,
    businessIntegrationId: string,
  ): Promise<void> {
    const resources =
      await this.resourceRepository.findManyByIntegration(
        businessIntegrationId,
      );

    const selectedResourceIds = resources
      .filter((r) => r.isSelected)
      .map((r) => r.id);

    const defaultResource = resources.find((r) => r.isDefault);

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        providerKey,
      );

    const existingConfig =
      (integration?.config as Record<string, unknown> | null) ?? {};

    await this.businessIntegrationRepository.update(businessId, providerKey, {
      config: {
        ...existingConfig,
        selectedResourceIds,
        defaultResourceId: defaultResource?.id ?? null,
      } as Prisma.InputJsonValue,
    });
  }
}
