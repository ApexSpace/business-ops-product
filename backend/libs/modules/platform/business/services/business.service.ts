import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { slugify, withSlugSuffix } from '@app/common/utils/slug.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { IndustriesService } from '@app/modules/crm/industries/services/industries.service';
import { SnapshotApplyService } from '@app/modules/platform/snapshots/services/snapshot-apply.service';
import { SnapshotsService } from '@app/modules/platform/snapshots/services/snapshots.service';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessRepository } from '../repositories/business.repository';
import { toBusinessResponse } from '../mappers/business.mapper';
import { CreateBusinessDto } from '../dto/create-business.dto';
import { UpdateBusinessDto } from '../dto/update-business.dto';
import {
  toBusinessCreateData,
  toBusinessUpdateData,
} from '../utils/business-profile-data.util';
import {
  extractFinancialSettings,
  mergeFinancialSettings,
  wrapFinancialSettings,
} from '../utils/financial-settings.util';
import {
  currencySymbolForCode,
  normalizeCurrencyCode,
} from '../utils/currency.util';

@Injectable()
export class BusinessService {
  constructor(
    private readonly businessRepository: BusinessRepository,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly industriesService: IndustriesService,
    private readonly snapshotsService: SnapshotsService,
    private readonly snapshotApplyService: SnapshotApplyService,
  ) {}

  async createPlatform(dto: CreateBusinessDto, actor: RequestUser) {
    const slug = await this.resolveUniqueSlug(dto.name);
    const industry = await this.industriesService.resolveForBusiness(
      dto.industryId,
    );

    if (!industry) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No active industry is configured. Add an industry in platform settings first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const snapshot = await this.snapshotsService.resolveForBusiness(
      dto.snapshotId,
    );

    if (!snapshot) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No published snapshot is configured. Add a snapshot in platform settings first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const profileData = toBusinessCreateData({
      ...dto,
      name: dto.name,
      industryId: industry.id,
    });

    const business = await this.prisma.$transaction(async (tx) => {
      const created = await tx.business.create({
        data: {
          ...profileData,
          slug,
          createdBy: { connect: { id: actor.id } },
        },
        include: { industry: true },
      });
      return created;
    });

    await this.snapshotApplyService.apply(business.id, snapshot.id, actor.id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId: business.id,
      action: 'business.created',
      entityType: 'Business',
      entityId: business.id,
      metadata: { name: business.name, slug: business.slug },
    });

    return toBusinessResponse(business);
  }

  async listPlatform(params: {
    page: number;
    limit: number;
    skip: number;
    status?: BusinessStatus;
    search?: string;
  }) {
    const { items, total } = await this.businessRepository.findMany({
      skip: params.skip,
      take: params.limit,
      status: params.status,
      search: params.search,
    });
    return {
      items: items.map(toBusinessResponse),
      meta: { total, page: params.page, limit: params.limit },
    };
  }

  async getPlatform(id: string) {
    const business = await this.businessRepository.findById(id);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toBusinessResponse(business);
  }

  async updatePlatform(id: string, dto: UpdateBusinessDto, actor: RequestUser) {
    const existing = await this.businessRepository.findById(id);
    if (!existing) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.industryId) {
      const industry = await this.industriesService.resolveForBusiness(
        dto.industryId,
      );
      if (!industry || industry.id !== dto.industryId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Invalid or inactive industry',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const updateData = this.buildUpdateData(existing, dto);

    if (dto.snapshotId) {
      const snapshot = await this.snapshotsService.resolveForBusiness(
        dto.snapshotId,
      );
      if (!snapshot || snapshot.id !== dto.snapshotId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Invalid or unpublished snapshot',
          HttpStatus.BAD_REQUEST,
        );
      }
      updateData.snapshot = { connect: { id: snapshot.id } };
    }

    const business = await this.businessRepository.update(id, updateData);

    if (dto.applySnapshot) {
      const targetSnapshotId = dto.snapshotId ?? existing.snapshotId;
      if (!targetSnapshotId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'No snapshot selected to apply',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.snapshotApplyService.apply(
        business.id,
        targetSnapshotId,
        actor.id,
      );
    }

    const refreshed = await this.businessRepository.findById(business.id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId: business.id,
      action: 'business.updated',
      entityType: 'Business',
      entityId: business.id,
      metadata: { ...dto },
    });

    return toBusinessResponse(refreshed ?? business);
  }

  async applySnapshotPlatform(
    businessId: string,
    snapshotId: string,
    actor: RequestUser,
  ) {
    const existing = await this.businessRepository.findById(businessId);
    if (!existing) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const snapshot = await this.snapshotsService.resolveForBusiness(snapshotId);
    if (!snapshot || snapshot.id !== snapshotId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid or unpublished snapshot',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.snapshotApplyService.apply(businessId, snapshot.id, actor.id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'platform.snapshot.applied',
      entityType: 'Snapshot',
      entityId: snapshot.id,
      metadata: { businessId, name: snapshot.name },
    });

    const refreshed = await this.businessRepository.findById(businessId);
    return toBusinessResponse(refreshed!);
  }

  async deletePlatform(id: string, actor: RequestUser) {
    const business = await this.getPlatform(id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId: business.id,
      action: 'business.deleted',
      entityType: 'Business',
      entityId: business.id,
      metadata: { name: business.name, slug: business.slug },
    });

    await this.businessRepository.hardDelete(id);

    return { deleted: true, id: business.id };
  }

  async getCurrent(businessId: string) {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toBusinessResponse(business);
  }

  async updateCurrent(
    businessId: string,
    dto: UpdateBusinessDto,
    actor: RequestUser,
  ) {
    return this.updatePlatform(businessId, dto, actor);
  }

  private buildUpdateData(
    existing: Awaited<ReturnType<BusinessRepository['findById']>> & object,
    dto: UpdateBusinessDto,
  ) {
    const data = toBusinessUpdateData(dto);

    const hasProfileExtensions =
      dto.logoUrl !== undefined ||
      dto.addressLine2 !== undefined ||
      dto.taxesAndCurrency !== undefined;

    if (!hasProfileExtensions) {
      return data;
    }

    const current = extractFinancialSettings(existing);
    const patch: Partial<typeof current> = {};

    if (dto.logoUrl !== undefined || dto.addressLine2 !== undefined) {
      patch.businessInformation = {
        ...current.businessInformation,
        ...(dto.logoUrl !== undefined
          ? { logoUrl: dto.logoUrl?.trim() ?? '' }
          : {}),
        ...(dto.addressLine2 !== undefined
          ? { addressLine2: dto.addressLine2?.trim() ?? '' }
          : {}),
      };
    }

    if (dto.taxesAndCurrency) {
      const taxesAndCurrency = {
        ...current.taxesAndCurrency,
        ...dto.taxesAndCurrency,
      };
      if (dto.taxesAndCurrency.currencyCode !== undefined) {
        taxesAndCurrency.currencyCode = normalizeCurrencyCode(
          dto.taxesAndCurrency.currencyCode,
        );
        taxesAndCurrency.currencySymbol = currencySymbolForCode(
          taxesAndCurrency.currencyCode,
        );
      }
      if (taxesAndCurrency.defaultTaxRate !== undefined) {
        taxesAndCurrency.defaultTaxRate = Math.min(
          100,
          Math.max(0, Number(taxesAndCurrency.defaultTaxRate) || 0),
        );
      }
      patch.taxesAndCurrency = taxesAndCurrency;
    }

    data.settings = wrapFinancialSettings(
      existing.settings,
      mergeFinancialSettings(current, patch),
    );

    return data;
  }

  private async resolveUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'business';
    let suffix = 1;
    while (suffix < 100) {
      const slug = withSlugSuffix(base, suffix);
      const existing = await this.businessRepository.findBySlug(slug);
      if (!existing) {
        return slug;
      }
      suffix += 1;
    }
    return `${base}-${randomUUID().slice(0, 8)}`;
  }
}
