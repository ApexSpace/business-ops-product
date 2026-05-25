import { HttpStatus, Injectable } from '@nestjs/common';
import { Plan, PlanStatus } from '@prisma/client';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { slugify } from '../../../common/utils/slug.util';
import { AuditService } from '../../audit/services/audit.service';
import {
  CreatePlanDto,
  PlanResponseDto,
  UpdatePlanDto,
} from '../dto/plan.dto';
import { PlanRepository } from '../repositories/plan.repository';

@Injectable()
export class PlansService {
  constructor(
    private readonly planRepository: PlanRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(params: {
    page: number;
    limit: number;
    skip: number;
    status?: PlanStatus;
  }): Promise<{
    items: PlanResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { items, total } = await this.planRepository.findMany(
      params.skip,
      params.limit,
      params.status,
    );

    return {
      items: items.map((plan) => this.toResponse(plan)),
      meta: { total, page: params.page, limit: params.limit },
    };
  }

  async create(dto: CreatePlanDto, actor: RequestUser): Promise<PlanResponseDto> {
    const slug = await this.resolveUniqueSlug(dto.name);
    const plan = await this.planRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      priceMonthly: dto.priceMonthly,
      priceYearly: dto.priceYearly,
      features: dto.features ?? [],
      status: dto.status ?? PlanStatus.ACTIVE,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan.created',
      entityType: 'Plan',
      entityId: plan.id,
      metadata: { name: plan.name },
    });

    return this.toResponse(plan);
  }

  async update(
    id: string,
    dto: UpdatePlanDto,
    actor: RequestUser,
  ): Promise<PlanResponseDto> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.planRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.priceMonthly !== undefined ? { priceMonthly: dto.priceMonthly } : {}),
      ...(dto.priceYearly !== undefined ? { priceYearly: dto.priceYearly } : {}),
      ...(dto.features !== undefined ? { features: dto.features } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan.updated',
      entityType: 'Plan',
      entityId: id,
      metadata: { changes: dto },
    });

    return this.toResponse(updated);
  }

  async remove(id: string, actor: RequestUser): Promise<void> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.planRepository.softDelete(id);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan.archived',
      entityType: 'Plan',
      entityId: id,
      metadata: { name: plan.name },
    });
  }

  private async resolveUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let suffix = 1;

    while (await this.planRepository.findBySlug(slug)) {
      slug = `${base}-${suffix++}`;
    }

    return slug;
  }

  private toResponse(plan: Plan): PlanResponseDto {
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      priceMonthly: plan.priceMonthly.toString(),
      priceYearly: plan.priceYearly?.toString() ?? null,
      features: (plan.features as string[] | null) ?? null,
      status: plan.status,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
