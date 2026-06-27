import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PackageExpirationPolicy,
  PackageServiceGroupQuantityType,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RootConfig } from '@app/core/config/configuration';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import {
  CreatePackageTemplateDto,
  CreateServiceGroupDto,
  PackageTemplateResponseDto,
  ReorderPackageTemplatesDto,
  UpdatePackageTemplateDto,
  UpdateServiceGroupDto,
} from '../dto/package.dto';
import { toPackageTemplate } from '../mappers/package.mapper';
import { PackageSettingsRepository } from '../repositories/package-settings.repository';
import { PackageTemplateRepository } from '../repositories/package-template.repository';
import { PackageSettingsService } from './package-settings.service';

@Injectable()
export class PackageTemplatesService {
  private readonly logger = new Logger(PackageTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateRepository: PackageTemplateRepository,
    private readonly settingsRepository: PackageSettingsRepository,
    private readonly settingsService: PackageSettingsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  async findAll(businessId: string): Promise<PackageTemplateResponseDto[]> {
    const rows = await this.templateRepository.findMany(businessId);
    const slug = await this.resolveSlug(businessId);
    return Promise.all(
      rows.map(async (row) =>
        toPackageTemplate(
          row,
          row.onlineSalesEnabled && slug
            ? this.buildDirectLink(slug, row.id)
            : null,
        ),
      ),
    );
  }

  async findOne(
    businessId: string,
    id: string,
  ): Promise<PackageTemplateResponseDto> {
    const row = await this.assertTemplate(businessId, id);
    const slug = await this.resolveSlug(businessId);
    return toPackageTemplate(
      row,
      row.onlineSalesEnabled && slug
        ? this.buildDirectLink(slug, row.id)
        : null,
    );
  }

  async create(
    businessId: string,
    dto: CreatePackageTemplateDto,
    actor: RequestUser,
  ): Promise<PackageTemplateResponseDto> {
    const sortOrder = await this.templateRepository.nextSortOrder(businessId);
    const row = await this.templateRepository.create(businessId, {
      name: dto.name.trim(),
      emoji: dto.emoji?.trim() || null,
      totalPrice: new Prisma.Decimal(dto.totalPrice.toFixed(2)),
      chargeTax: dto.chargeTax ?? false,
      expirationPolicy:
        dto.expirationPolicy ?? PackageExpirationPolicy.NEVER,
      expirationDays: dto.expirationDays ?? null,
      onlineSalesEnabled: dto.onlineSalesEnabled ?? false,
      shortDescription: dto.shortDescription?.trim() || null,
      description: dto.description ?? null,
      requireAgreement: dto.requireAgreement ?? false,
      agreementText: dto.agreementText ?? null,
      commissionBasis: dto.commissionBasis,
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'package_template.created',
      entityType: 'PackageTemplate',
      entityId: row.id,
    });

    return toPackageTemplate(row);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdatePackageTemplateDto,
    actor: RequestUser,
  ): Promise<PackageTemplateResponseDto> {
    await this.assertTemplate(businessId, id);
    const row = await this.templateRepository.update(businessId, id, {
      name: dto.name.trim(),
      emoji: dto.emoji?.trim() || null,
      totalPrice: new Prisma.Decimal(dto.totalPrice.toFixed(2)),
      chargeTax: dto.chargeTax ?? false,
      expirationPolicy: dto.expirationPolicy,
      expirationDays: dto.expirationDays ?? null,
      onlineSalesEnabled: dto.onlineSalesEnabled ?? false,
      shortDescription: dto.shortDescription?.trim() || null,
      description: dto.description ?? null,
      requireAgreement: dto.requireAgreement ?? false,
      agreementText: dto.agreementText ?? null,
      commissionBasis: dto.commissionBasis,
    });

    this.warnGroupPriceMismatch(row);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'package_template.updated',
      entityType: 'PackageTemplate',
      entityId: id,
    });

    if (dto.onlineSalesEnabled) {
      await this.settingsRepository.upsert(businessId, {
        onlineSalesEnabled: true,
      });
    }

    const slug = await this.resolveSlug(businessId);
    return toPackageTemplate(
      row,
      row.onlineSalesEnabled && slug
        ? this.buildDirectLink(slug, row.id)
        : null,
    );
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertTemplate(businessId, id);
    const activeCount =
      await this.templateRepository.countActiveClientPackages(businessId, id);
    if (activeCount > 0) {
      throw new AppException(
        ErrorCode.PACKAGE_TEMPLATE_HAS_ACTIVE_CLIENTS,
        'Cannot delete a package that has active client packages',
        HttpStatus.CONFLICT,
      );
    }

    await this.templateRepository.delete(businessId, id);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'package_template.deleted',
      entityType: 'PackageTemplate',
      entityId: id,
    });
  }

  async reorder(
    businessId: string,
    dto: ReorderPackageTemplatesDto,
    actor: RequestUser,
  ): Promise<void> {
    await this.templateRepository.reorder(businessId, dto.ids);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'package_template.reordered',
      entityType: 'PackageTemplate',
      entityId: businessId,
    });
  }

  async addServiceGroup(
    businessId: string,
    templateId: string,
    dto: CreateServiceGroupDto,
    actor: RequestUser,
  ) {
    await this.assertTemplate(businessId, templateId);
    await this.assertServices(businessId, dto.serviceIds);

    const sortOrder = await this.nextGroupSortOrder(templateId);
    const group = await this.prisma.packageServiceGroup.create({
      data: {
        packageTemplateId: templateId,
        quantity: dto.quantity,
        quantityType:
          dto.quantityType ?? PackageServiceGroupQuantityType.ONE,
        groupPrice: new Prisma.Decimal(dto.groupPrice.toFixed(2)),
        sortOrder,
        serviceGroupItems: {
          create: dto.serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: {
        serviceGroupItems: {
          include: { service: { select: { id: true, name: true, price: true } } },
        },
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'package_service_group.created',
      entityType: 'PackageServiceGroup',
      entityId: group.id,
    });

    return group;
  }

  async updateServiceGroup(
    businessId: string,
    templateId: string,
    groupId: string,
    dto: UpdateServiceGroupDto,
    actor: RequestUser,
  ) {
    await this.assertServiceGroup(businessId, templateId, groupId);
    await this.assertServices(businessId, dto.serviceIds);

    const group = await this.prisma.$transaction(async (tx) => {
      await tx.packageServiceGroupItem.deleteMany({
        where: { serviceGroupId: groupId },
      });
      return tx.packageServiceGroup.update({
        where: { id: groupId },
        data: {
          quantity: dto.quantity,
          quantityType: dto.quantityType,
          groupPrice: new Prisma.Decimal(dto.groupPrice.toFixed(2)),
          serviceGroupItems: {
            create: dto.serviceIds.map((serviceId) => ({ serviceId })),
          },
        },
        include: {
          serviceGroupItems: {
            include: {
              service: { select: { id: true, name: true, price: true } },
            },
          },
        },
      });
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'package_service_group.updated',
      entityType: 'PackageServiceGroup',
      entityId: groupId,
    });

    return group;
  }

  async removeServiceGroup(
    businessId: string,
    templateId: string,
    groupId: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertServiceGroup(businessId, templateId, groupId);
    await this.prisma.packageServiceGroup.delete({ where: { id: groupId } });
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'package_service_group.deleted',
      entityType: 'PackageServiceGroup',
      entityId: groupId,
    });
  }

  getDirectLink(businessId: string, templateId: string): Promise<string | null> {
    return this.resolveSlug(businessId).then((slug) =>
      slug ? this.buildDirectLink(slug, templateId) : null,
    );
  }

  private buildDirectLink(slug: string, templateId: string): string {
    const frontendUrl = this.configService.get('app', { infer: true }).frontendUrl;
    return `${frontendUrl}/packages/${slug}/${templateId}`;
  }

  private async resolveSlug(businessId: string): Promise<string | null> {
    const settings =
      await this.settingsRepository.findByBusinessId(businessId);
    if (!settings?.publicSlug) {
      return this.settingsService.ensurePublicSlug(businessId);
    }
    return settings.publicSlug;
  }

  private async assertTemplate(businessId: string, id: string) {
    const row = await this.templateRepository.findById(businessId, id);
    if (!row) {
      throw new AppException(
        ErrorCode.PACKAGE_TEMPLATE_NOT_FOUND,
        'Package template not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async assertServiceGroup(
    businessId: string,
    templateId: string,
    groupId: string,
  ) {
    const group = await this.prisma.packageServiceGroup.findFirst({
      where: {
        id: groupId,
        packageTemplateId: templateId,
        packageTemplate: { businessId },
      },
    });
    if (!group) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Service group not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return group;
  }

  private async assertServices(businessId: string, serviceIds: string[]) {
    const count = await this.prisma.service.count({
      where: {
        businessId,
        id: { in: serviceIds },
        deletedAt: null,
        status: 'ACTIVE',
      },
    });
    if (count !== serviceIds.length) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'One or more services were not found',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async nextGroupSortOrder(templateId: string): Promise<number> {
    const max = await this.prisma.packageServiceGroup.aggregate({
      where: { packageTemplateId: templateId },
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  private warnGroupPriceMismatch(
    row: Awaited<ReturnType<PackageTemplateRepository['findById']>>,
  ) {
    if (!row) return;
    const groupSum = row.serviceGroups.reduce(
      (sum, g) => sum + Number(g.groupPrice.toString()),
      0,
    );
    const total = Number(row.totalPrice.toString());
    if (Math.abs(groupSum - total) > 0.01) {
      this.logger.warn(
        `Package template ${row.id}: group prices sum (${groupSum}) does not match totalPrice (${total})`,
      );
    }
  }
}
