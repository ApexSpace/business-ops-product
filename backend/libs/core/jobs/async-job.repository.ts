import { Injectable } from '@nestjs/common';
import { AsyncJobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AsyncJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AsyncJobCreateInput) {
    return this.prisma.asyncJob.create({ data });
  }

  findById(businessId: string, id: string) {
    return this.prisma.asyncJob.findFirst({
      where: { id, businessId },
    });
  }

  findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    return this.prisma.asyncJob.findFirst({
      where: { businessId, idempotencyKey },
    });
  }

  update(id: string, data: Prisma.AsyncJobUpdateInput) {
    return this.prisma.asyncJob.update({ where: { id }, data });
  }

  markActive(id: string, bullJobId?: string) {
    return this.update(id, {
      status: AsyncJobStatus.ACTIVE,
      bullJobId: bullJobId ?? undefined,
    });
  }

  markCompleted(id: string, result?: Prisma.InputJsonValue) {
    return this.update(id, {
      status: AsyncJobStatus.COMPLETED,
      completedAt: new Date(),
      result: result ?? undefined,
      errorMessage: null,
    });
  }

  markFailed(id: string, errorMessage: string) {
    return this.update(id, {
      status: AsyncJobStatus.FAILED,
      completedAt: new Date(),
      errorMessage,
    });
  }
}
