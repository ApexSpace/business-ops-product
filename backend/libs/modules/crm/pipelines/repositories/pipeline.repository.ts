import { Injectable } from '@nestjs/common';
import { Pipeline, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const pipelineWithStages = {
  stages: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.PipelineInclude;

export type PipelineWithStages = Prisma.PipelineGetPayload<{
  include: typeof pipelineWithStages;
}>;

@Injectable()
export class PipelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(
    businessId: string,
    id: string,
  ): Promise<PipelineWithStages | null> {
    return this.prisma.pipeline.findFirst({
      where: { id, businessId },
      include: pipelineWithStages,
    });
  }

  findDefault(businessId: string): Promise<PipelineWithStages | null> {
    return this.prisma.pipeline.findFirst({
      where: { businessId, isDefault: true },
      include: pipelineWithStages,
    });
  }

  findMany(businessId: string): Promise<PipelineWithStages[]> {
    return this.prisma.pipeline.findMany({
      where: { businessId },
      include: pipelineWithStages,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  findByName(
    businessId: string,
    name: string,
    excludeId?: string,
  ): Promise<Pipeline | null> {
    return this.prisma.pipeline.findFirst({
      where: {
        businessId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  countLeads(businessId: string, pipelineId: string): Promise<number> {
    return this.prisma.lead.count({
      where: { businessId, pipelineId, deletedAt: null },
    });
  }

  create(
    businessId: string,
    data: { name: string; isDefault?: boolean },
  ): Promise<PipelineWithStages> {
    return this.prisma.pipeline.create({
      data: {
        businessId,
        name: data.name,
        isDefault: data.isDefault ?? false,
      },
      include: pipelineWithStages,
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.PipelineUpdateInput,
  ): Promise<PipelineWithStages | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.pipeline.update({
      where: { id },
      data,
      include: pipelineWithStages,
    });
  }

  async clearDefaultExcept(
    businessId: string,
    exceptId?: string,
  ): Promise<void> {
    await this.prisma.pipeline.updateMany({
      where: {
        businessId,
        isDefault: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  }

  async delete(businessId: string, id: string): Promise<Pipeline | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.pipeline.delete({ where: { id } });
  }

  countByBusiness(businessId: string): Promise<number> {
    return this.prisma.pipeline.count({ where: { businessId } });
  }
}
