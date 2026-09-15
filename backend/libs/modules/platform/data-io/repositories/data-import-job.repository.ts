import { Injectable } from '@nestjs/common';
import {
  DataImportEntityType,
  DataImportJob,
  DataImportJobStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class DataImportJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.DataImportJobCreateInput): Promise<DataImportJob> {
    return this.prisma.dataImportJob.create({ data });
  }

  findById(businessId: string, id: string): Promise<DataImportJob | null> {
    return this.prisma.dataImportJob.findFirst({
      where: { id, businessId },
    });
  }

  findActiveForEntity(
    businessId: string,
    entityType: DataImportEntityType,
  ): Promise<DataImportJob | null> {
    return this.prisma.dataImportJob.findFirst({
      where: {
        businessId,
        entityType,
        status: {
          in: [
            DataImportJobStatus.UPLOADED,
            DataImportJobStatus.MAPPED,
            DataImportJobStatus.VALIDATING,
            DataImportJobStatus.IMPORTING,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  list(
    businessId: string,
    params: { page: number; limit: number; entityType?: DataImportEntityType },
  ): Promise<{ items: DataImportJob[]; total: number }> {
    const where: Prisma.DataImportJobWhereInput = {
      businessId,
      ...(params.entityType ? { entityType: params.entityType } : {}),
    };
    return Promise.all([
      this.prisma.dataImportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.dataImportJob.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  update(
    id: string,
    data: Prisma.DataImportJobUpdateInput,
  ): Promise<DataImportJob> {
    return this.prisma.dataImportJob.update({ where: { id }, data });
  }
}
