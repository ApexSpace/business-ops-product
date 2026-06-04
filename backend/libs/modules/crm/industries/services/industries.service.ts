import { HttpStatus, Injectable } from '@nestjs/common';
import { IndustryStatus, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { slugify } from '@app/common/utils/slug.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateIndustryDto,
  IndustryOptionDto,
  IndustryResponseDto,
  UpdateIndustryDto,
} from '../dto/industry.dto';
import {
  toIndustryOption,
  toIndustryResponse,
} from '../mappers/industry.mapper';
import { IndustryRepository } from '../repositories/industry.repository';

@Injectable()
export class IndustriesService {
  constructor(
    private readonly industryRepository: IndustryRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(params: {
    page: number;
    limit: number;
    skip: number;
    status?: IndustryStatus;
  }) {
    const { items, total } = await this.industryRepository.findMany({
      skip: params.skip,
      take: params.limit,
      status: params.status,
    });
    return {
      items: items.map(toIndustryResponse),
      meta: { total, page: params.page, limit: params.limit },
    };
  }

  async listActiveOptions(): Promise<IndustryOptionDto[]> {
    const items = await this.industryRepository.findAllActive();
    return items.map(toIndustryOption);
  }

  async get(id: string): Promise<IndustryResponseDto> {
    const industry = await this.industryRepository.findById(id);
    if (!industry) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Industry not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toIndustryResponse(industry);
  }

  async create(
    dto: CreateIndustryDto,
    actor: RequestUser,
  ): Promise<IndustryResponseDto> {
    const slug = await this.resolveUniqueSlug(dto.name);
    const industry = await this.industryRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      labels: dto.labels as unknown as Prisma.InputJsonValue,
      pipelineTemplate: dto.pipelineTemplate as unknown as Prisma.InputJsonValue,
      status: dto.status ?? IndustryStatus.ACTIVE,
      sortOrder: dto.sortOrder ?? 0,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.industry.created',
      entityType: 'Industry',
      entityId: industry.id,
      metadata: { name: industry.name },
    });

    return toIndustryResponse(industry);
  }

  async update(
    id: string,
    dto: UpdateIndustryDto,
    actor: RequestUser,
  ): Promise<IndustryResponseDto> {
    await this.get(id);

    const updated = await this.industryRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.labels !== undefined
        ? { labels: dto.labels as unknown as Prisma.InputJsonValue }
        : {}),
      ...(dto.pipelineTemplate !== undefined
        ? {
            pipelineTemplate:
              dto.pipelineTemplate as unknown as Prisma.InputJsonValue,
          }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.industry.updated',
      entityType: 'Industry',
      entityId: id,
      metadata: { changes: dto },
    });

    return toIndustryResponse(updated);
  }

  async remove(id: string, actor: RequestUser): Promise<void> {
    const industry = await this.industryRepository.findById(id);
    if (!industry) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Industry not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const inUse = await this.industryRepository.countBusinesses(id);
    if (inUse > 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot archive an industry that is assigned to businesses',
        HttpStatus.CONFLICT,
      );
    }

    await this.industryRepository.softDelete(id);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.industry.archived',
      entityType: 'Industry',
      entityId: id,
      metadata: { name: industry.name },
    });
  }

  async resolveForBusiness(industryId?: string | null) {
    if (industryId) {
      const industry = await this.industryRepository.findById(industryId);
      if (industry && industry.status === IndustryStatus.ACTIVE) {
        return industry;
      }
    }

    const active = await this.industryRepository.findAllActive();
    return active[0] ?? null;
  }

  private async resolveUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let suffix = 1;

    while (await this.industryRepository.findBySlug(slug)) {
      slug = `${base}-${suffix++}`;
    }

    return slug;
  }
}
