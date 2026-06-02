import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { slugify, withSlugSuffix } from '../../../common/utils/slug.util';
import { AuditService } from '../../audit/services/audit.service';
import { IndustriesService } from '../../industries/services/industries.service';
import { PipelineProvisioningService } from '../../pipelines/services/pipeline-provisioning.service';
import { PrismaService } from '../../../core/database/prisma.service';
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
    private readonly pipelineProvisioning: PipelineProvisioningService,
    private readonly industriesService: IndustriesService,
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
      await this.pipelineProvisioning.provisionDefaultPipeline(
        tx,
        created.id,
        industry.pipelineTemplate,
      );
      return created;
    });

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
  }) {
    const { items, total } = await this.businessRepository.findMany({
      skip: params.skip,
      take: params.limit,
      status: params.status,
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

    const business = await this.businessRepository.update(
      id,
      this.buildUpdateData(existing, dto),
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId: business.id,
      action: 'business.updated',
      entityType: 'Business',
      entityId: business.id,
      metadata: { ...dto },
    });

    return toBusinessResponse(business);
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
