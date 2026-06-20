import { Injectable } from '@nestjs/common';
import { CannedResponse, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class CannedResponsesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(businessId: string) {
    return { businessId, deletedAt: null };
  }

  findMany(businessId: string): Promise<CannedResponse[]> {
    return this.prisma.cannedResponse.findMany({
      where: this.activeWhere(businessId),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findById(businessId: string, id: string): Promise<CannedResponse | null> {
    return this.prisma.cannedResponse.findFirst({
      where: { ...this.activeWhere(businessId), id },
    });
  }

  create(data: Prisma.CannedResponseCreateInput): Promise<CannedResponse> {
    return this.prisma.cannedResponse.create({ data });
  }

  update(
    id: string,
    data: Prisma.CannedResponseUpdateInput,
  ): Promise<CannedResponse> {
    return this.prisma.cannedResponse.update({ where: { id }, data });
  }

  softDelete(businessId: string, id: string): Promise<void> {
    return this.prisma.cannedResponse
      .updateMany({
        where: { id, businessId, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      .then(() => undefined);
  }

  async getNextSortOrder(businessId: string): Promise<number> {
    const max = await this.prisma.cannedResponse.aggregate({
      where: this.activeWhere(businessId),
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }
}
