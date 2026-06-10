import { Injectable } from '@nestjs/common';
import { PipelineStage, PipelineStageType, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class PipelineStageRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(
    businessId: string,
    pipelineId: string,
    id: string,
  ): Promise<PipelineStage | null> {
    return this.prisma.pipelineStage.findFirst({
      where: { id, businessId, pipelineId },
    });
  }

  findByPipeline(
    businessId: string,
    pipelineId: string,
  ): Promise<PipelineStage[]> {
    return this.prisma.pipelineStage.findMany({
      where: { businessId, pipelineId },
      orderBy: { position: 'asc' },
    });
  }

  findFirstByPosition(
    businessId: string,
    pipelineId: string,
    position = 1,
  ): Promise<PipelineStage | null> {
    return this.prisma.pipelineStage.findFirst({
      where: { businessId, pipelineId, position },
    });
  }

  getMaxPosition(pipelineId: string): Promise<number> {
    return this.prisma.pipelineStage
      .aggregate({
        where: { pipelineId },
        _max: { position: true },
      })
      .then((r) => r._max.position ?? 0);
  }

  countLeads(businessId: string, pipelineStageId: string): Promise<number> {
    return this.prisma.lead.count({
      where: { businessId, pipelineStageId, deletedAt: null },
    });
  }

  create(
    businessId: string,
    pipelineId: string,
    data: { name: string; position: number; type?: PipelineStageType | null },
  ): Promise<PipelineStage> {
    return this.prisma.pipelineStage.create({
      data: {
        businessId,
        pipelineId,
        name: data.name,
        position: data.position,
        type: data.type ?? null,
      },
    });
  }

  async update(
    businessId: string,
    pipelineId: string,
    id: string,
    data: Prisma.PipelineStageUpdateInput,
  ): Promise<PipelineStage | null> {
    const existing = await this.findById(businessId, pipelineId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.pipelineStage.update({ where: { id }, data });
  }

  async shiftPositionsFrom(
    pipelineId: string,
    fromPosition: number,
    delta: number,
  ): Promise<void> {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { pipelineId, position: { gte: fromPosition } },
      orderBy: { position: delta > 0 ? 'desc' : 'asc' },
    });
    for (const stage of stages) {
      await this.prisma.pipelineStage.update({
        where: { id: stage.id },
        data: { position: stage.position + delta },
      });
    }
  }

  async reorder(
    businessId: string,
    pipelineId: string,
    stageIds: string[],
  ): Promise<PipelineStage[]> {
    const stages = await this.findByPipeline(businessId, pipelineId);
    if (stages.length !== stageIds.length) {
      return [];
    }
    const stageIdSet = new Set(stages.map((s) => s.id));
    if (!stageIds.every((id) => stageIdSet.has(id))) {
      return [];
    }

    await this.prisma.$transaction(async (tx) => {
      const offset = 10000;
      for (const stage of stages) {
        await tx.pipelineStage.update({
          where: { id: stage.id },
          data: { position: stage.position + offset },
        });
      }
      for (let i = 0; i < stageIds.length; i++) {
        await tx.pipelineStage.update({
          where: { id: stageIds[i] },
          data: { position: i + 1 },
        });
      }
    });

    return this.findByPipeline(businessId, pipelineId);
  }

  async delete(
    businessId: string,
    pipelineId: string,
    id: string,
  ): Promise<PipelineStage | null> {
    const existing = await this.findById(businessId, pipelineId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.pipelineStage.delete({ where: { id } });
  }
}
