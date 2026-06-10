import { HttpStatus, Injectable } from '@nestjs/common';
import {
  IntegrationConnectionType,
  IntegrationProvider,
  IntegrationStatus,
  Prisma,
} from '@prisma/client';
import { isAutomatedConnectionType } from './utils/integration-connection.util';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  BusinessIntegrationResponseDto,
  ConnectIntegrationDto,
  CreateIntegrationProviderDto,
  IntegrationProviderResponseDto,
  IntegrationProviderWithStatusDto,
  PlatformIntegrationProviderWithStatusDto,
  PlatformIntegrationResponseDto,
  UpdateIntegrationDto,
  UpdateIntegrationProviderDto,
} from './dto/integration.dto';
import {
  toBusinessIntegrationResponse,
  toBusinessProviderWithStatus,
  toIntegrationProviderResponse,
  toPlatformIntegrationResponse,
  toPlatformProviderWithStatus,
} from './mappers/integration.mapper';
import { BusinessIntegrationRepository } from './repositories/business-integration.repository';
import { IntegrationProviderRepository } from './repositories/integration-provider.repository';
import { PlatformIntegrationRepository } from './repositories/platform-integration.repository';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly providerRepository: IntegrationProviderRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly platformIntegrationRepository: PlatformIntegrationRepository,
    private readonly auditService: AuditService,
  ) {}

  // ── Business providers ──────────────────────────────────────────────

  async listBusinessProviders(
    businessId: string,
  ): Promise<IntegrationProviderWithStatusDto[]> {
    const providers =
      await this.providerRepository.findActiveBusinessProviders();
    const integrations =
      await this.businessIntegrationRepository.findManyByBusiness(businessId);
    const integrationMap = new Map(integrations.map((i) => [i.providerKey, i]));

    return providers.map((provider) =>
      toBusinessProviderWithStatus(provider, integrationMap.get(provider.key)),
    );
  }

  async listBusinessIntegrations(
    businessId: string,
  ): Promise<BusinessIntegrationResponseDto[]> {
    const integrations =
      await this.businessIntegrationRepository.findManyByBusiness(businessId);
    return integrations.map(toBusinessIntegrationResponse);
  }

  async getBusinessIntegration(
    businessId: string,
    providerKey: string,
  ): Promise<BusinessIntegrationResponseDto> {
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
    return toBusinessIntegrationResponse(integration);
  }

  async connectBusinessIntegration(
    businessId: string,
    providerKey: string,
    dto: ConnectIntegrationDto,
    actor: RequestUser,
  ): Promise<BusinessIntegrationResponseDto> {
    const provider = await this.assertBusinessProvider(providerKey);
    if (isAutomatedConnectionType(provider.connectionType)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This integration must be connected via OAuth or embedded signup',
        HttpStatus.BAD_REQUEST,
      );
    }
    const now = new Date();

    const integration = await this.businessIntegrationRepository.upsert(
      businessId,
      providerKey,
      {
        status: IntegrationStatus.CONNECTED,
        config: dto.config as Prisma.InputJsonValue | undefined,
        credentials: Prisma.DbNull,
        connectedAccountName: dto.connectedAccountName ?? null,
        connectedAccountEmail: dto.connectedAccountEmail ?? null,
        connectedAt: now,
        errorMessage: null,
      },
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'integration.connected',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: { providerKey, providerName: provider.name },
    });

    return toBusinessIntegrationResponse(integration);
  }

  async updateBusinessIntegration(
    businessId: string,
    providerKey: string,
    dto: UpdateIntegrationDto,
    actor: RequestUser,
  ): Promise<BusinessIntegrationResponseDto> {
    await this.assertBusinessIntegrationExists(businessId, providerKey);

    const integration = await this.businessIntegrationRepository.update(
      businessId,
      providerKey,
      {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.config !== undefined
          ? { config: dto.config as Prisma.InputJsonValue }
          : {}),
        ...(dto.connectedAccountName !== undefined
          ? { connectedAccountName: dto.connectedAccountName }
          : {}),
        ...(dto.connectedAccountEmail !== undefined
          ? { connectedAccountEmail: dto.connectedAccountEmail }
          : {}),
        ...(dto.errorMessage !== undefined
          ? { errorMessage: dto.errorMessage }
          : {}),
      },
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'integration.updated',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: { providerKey, changes: dto },
    });

    return toBusinessIntegrationResponse(integration);
  }

  async deleteBusinessIntegration(
    businessId: string,
    providerKey: string,
    actor: RequestUser,
  ): Promise<void> {
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

    await this.businessIntegrationRepository.delete(businessId, providerKey);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'integration.deleted',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: { providerKey },
    });
  }

  // ── Platform providers ──────────────────────────────────────────────

  async listPlatformProviders(): Promise<
    PlatformIntegrationProviderWithStatusDto[]
  > {
    const providers =
      await this.providerRepository.findActivePlatformProviders();
    const integrations = await this.platformIntegrationRepository.findMany();
    const integrationMap = new Map(integrations.map((i) => [i.providerKey, i]));

    return providers.map((provider) =>
      toPlatformProviderWithStatus(provider, integrationMap.get(provider.key)),
    );
  }

  async listAllProviders(): Promise<IntegrationProviderResponseDto[]> {
    const providers = await this.providerRepository.findAll();
    return providers.map(toIntegrationProviderResponse);
  }

  async createProvider(
    dto: CreateIntegrationProviderDto,
    actor: RequestUser,
  ): Promise<IntegrationProviderResponseDto> {
    const existing = await this.providerRepository.findByKey(dto.key);
    if (existing) {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_KEY_CONFLICT,
        'Integration provider key already exists',
        HttpStatus.CONFLICT,
      );
    }

    const provider = await this.providerRepository.create({
      key: dto.key,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      logoUrl: dto.logoUrl,
      isPlatformLevel: dto.isPlatformLevel ?? false,
      isBusinessLevel: dto.isBusinessLevel ?? true,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      connectionType: dto.connectionType ?? IntegrationConnectionType.MANUAL,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.integration.provider.created',
      entityType: 'IntegrationProvider',
      entityId: provider.id,
      metadata: { key: provider.key, name: provider.name },
    });

    return toIntegrationProviderResponse(provider);
  }

  async updateProvider(
    id: string,
    dto: UpdateIntegrationProviderDto,
    actor: RequestUser,
  ): Promise<IntegrationProviderResponseDto> {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_FOUND,
        'Integration provider not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.providerRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      ...(dto.isPlatformLevel !== undefined
        ? { isPlatformLevel: dto.isPlatformLevel }
        : {}),
      ...(dto.isBusinessLevel !== undefined
        ? { isBusinessLevel: dto.isBusinessLevel }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.connectionType !== undefined
        ? { connectionType: dto.connectionType }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.integration.provider.updated',
      entityType: 'IntegrationProvider',
      entityId: id,
      metadata: { changes: dto },
    });

    return toIntegrationProviderResponse(updated);
  }

  // ── Platform integrations ───────────────────────────────────────────

  async listPlatformIntegrations(): Promise<PlatformIntegrationResponseDto[]> {
    const integrations = await this.platformIntegrationRepository.findMany();
    return integrations.map(toPlatformIntegrationResponse);
  }

  async getPlatformIntegration(
    providerKey: string,
  ): Promise<PlatformIntegrationResponseDto> {
    const integration =
      await this.platformIntegrationRepository.findByKey(providerKey);
    if (!integration) {
      throw new AppException(
        ErrorCode.INTEGRATION_NOT_FOUND,
        'Integration not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toPlatformIntegrationResponse(integration);
  }

  async connectPlatformIntegration(
    providerKey: string,
    dto: ConnectIntegrationDto,
    actor: RequestUser,
  ): Promise<PlatformIntegrationResponseDto> {
    const provider = await this.assertPlatformProvider(providerKey);
    const now = new Date();

    const integration = await this.platformIntegrationRepository.upsert(
      providerKey,
      {
        status: IntegrationStatus.CONNECTED,
        config: dto.config as Prisma.InputJsonValue | undefined,
        credentials: Prisma.DbNull,
        connectedAccountName: dto.connectedAccountName ?? null,
        connectedAccountEmail: dto.connectedAccountEmail ?? null,
        connectedAt: now,
        errorMessage: null,
      },
    );

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.integration.connected',
      entityType: 'PlatformIntegration',
      entityId: integration.id,
      metadata: { providerKey, providerName: provider.name },
    });

    return toPlatformIntegrationResponse(integration);
  }

  async updatePlatformIntegration(
    providerKey: string,
    dto: UpdateIntegrationDto,
    actor: RequestUser,
  ): Promise<PlatformIntegrationResponseDto> {
    const existing =
      await this.platformIntegrationRepository.findByKey(providerKey);
    if (!existing) {
      throw new AppException(
        ErrorCode.INTEGRATION_NOT_FOUND,
        'Integration not found',
        HttpStatus.NOT_FOUND,
      );
    }

    let updateData: Prisma.PlatformIntegrationUpdateInput = {
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.connectedAccountName !== undefined
        ? { connectedAccountName: dto.connectedAccountName }
        : {}),
      ...(dto.connectedAccountEmail !== undefined
        ? { connectedAccountEmail: dto.connectedAccountEmail }
        : {}),
      ...(dto.errorMessage !== undefined
        ? { errorMessage: dto.errorMessage }
        : {}),
    };

    if (dto.config !== undefined) {
      updateData = {
        ...updateData,
        config: dto.config as Prisma.InputJsonValue,
      };
    }

    const integration = await this.platformIntegrationRepository.update(
      providerKey,
      updateData,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.integration.updated',
      entityType: 'PlatformIntegration',
      entityId: integration.id,
      metadata: { providerKey, changes: dto },
    });

    return toPlatformIntegrationResponse(integration);
  }

  async deletePlatformIntegration(
    providerKey: string,
    actor: RequestUser,
  ): Promise<void> {
    const integration =
      await this.platformIntegrationRepository.findByKey(providerKey);
    if (!integration) {
      throw new AppException(
        ErrorCode.INTEGRATION_NOT_FOUND,
        'Integration not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.platformIntegrationRepository.delete(providerKey);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.integration.deleted',
      entityType: 'PlatformIntegration',
      entityId: integration.id,
      metadata: { providerKey },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private async assertBusinessProvider(
    providerKey: string,
  ): Promise<IntegrationProvider> {
    const provider = await this.providerRepository.findByKey(providerKey);
    if (!provider || !provider.isActive || !provider.isBusinessLevel) {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_AVAILABLE,
        'Integration provider is not available for business',
        HttpStatus.BAD_REQUEST,
      );
    }
    return provider;
  }

  private async assertPlatformProvider(
    providerKey: string,
  ): Promise<IntegrationProvider> {
    const provider = await this.providerRepository.findByKey(providerKey);
    if (!provider || !provider.isActive || !provider.isPlatformLevel) {
      throw new AppException(
        ErrorCode.INTEGRATION_PROVIDER_NOT_AVAILABLE,
        'Integration provider is not available for platform',
        HttpStatus.BAD_REQUEST,
      );
    }
    return provider;
  }

  private async assertBusinessIntegrationExists(
    businessId: string,
    providerKey: string,
  ): Promise<void> {
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
  }

  private async assertPlatformIntegrationExists(
    providerKey: string,
  ): Promise<void> {
    const integration =
      await this.platformIntegrationRepository.findByKey(providerKey);
    if (!integration) {
      throw new AppException(
        ErrorCode.INTEGRATION_NOT_FOUND,
        'Integration not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
