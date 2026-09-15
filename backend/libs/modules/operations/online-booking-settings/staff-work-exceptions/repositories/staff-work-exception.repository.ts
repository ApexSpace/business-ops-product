import { Injectable } from '@nestjs/common';
import { Prisma, StaffWorkException } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { isFullDayUnavailable } from '../utils/full-day-exception.util';

const BULK_CHUNK_SIZE = 500;

export type FullDayUnavailableUpsert = {
  userId: string;
  date: Date;
  reason?: string | null;
};

@Injectable()
export class StaffWorkExceptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByStaffInRange(
    businessId: string,
    userId: string,
    from: Date,
    to: Date,
  ): Promise<StaffWorkException[]> {
    return this.prisma.staffWorkException.findMany({
      where: {
        businessId,
        userId,
        date: { gte: from, lte: to },
      },
    });
  }

  findByStaffIdsInRange(
    businessId: string,
    userIds: string[],
    from: Date,
    to: Date,
  ): Promise<StaffWorkException[]> {
    if (userIds.length === 0) return Promise.resolve([]);
    return this.prisma.staffWorkException.findMany({
      where: {
        businessId,
        userId: { in: userIds },
        date: { gte: from, lte: to },
      },
    });
  }

  async upsertFullDayUnavailable(
    businessId: string,
    userId: string,
    date: Date,
    reason?: string | null,
  ): Promise<StaffWorkException> {
    return this.prisma.staffWorkException.upsert({
      where: {
        businessId_userId_date: { businessId, userId, date },
      },
      create: {
        businessId,
        userId,
        date,
        isUnavailable: true,
        startTime: null,
        endTime: null,
        reason: reason ?? null,
      },
      update: {
        isUnavailable: true,
        startTime: null,
        endTime: null,
        reason: reason ?? null,
      },
    });
  }

  async bulkUpsertFullDayUnavailable(
    businessId: string,
    rows: FullDayUnavailableUpsert[],
  ): Promise<number> {
    if (rows.length === 0) return 0;

    let affected = 0;
    for (let i = 0; i < rows.length; i += BULK_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + BULK_CHUNK_SIZE);
      await this.prisma.$transaction(
        chunk.map((row) =>
          this.prisma.staffWorkException.upsert({
            where: {
              businessId_userId_date: {
                businessId,
                userId: row.userId,
                date: row.date,
              },
            },
            create: {
              businessId,
              userId: row.userId,
              date: row.date,
              isUnavailable: true,
              startTime: null,
              endTime: null,
              reason: row.reason ?? null,
            },
            update: {
              isUnavailable: true,
              startTime: null,
              endTime: null,
              reason: row.reason ?? null,
            },
          }),
        ),
      );
      affected += chunk.length;
    }
    return affected;
  }

  countFullDayUnavailableInRange(
    businessId: string,
    userIds: string[],
    from: Date,
    to: Date,
  ): Promise<number> {
    if (userIds.length === 0) return Promise.resolve(0);
    return this.prisma.staffWorkException.count({
      where: this.fullDayUnavailableWhere(businessId, userIds, from, to),
    });
  }

  async bulkDeleteFullDayUnavailable(
    businessId: string,
    userIds: string[],
    from: Date,
    to: Date,
  ): Promise<number> {
    if (userIds.length === 0) return 0;

    const matching = await this.prisma.staffWorkException.findMany({
      where: this.fullDayUnavailableWhere(businessId, userIds, from, to),
      select: { id: true },
    });
    if (matching.length === 0) return 0;

    const ids = matching.map((row) => row.id);
    for (let i = 0; i < ids.length; i += BULK_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + BULK_CHUNK_SIZE);
      await this.prisma.staffWorkException.deleteMany({
        where: { id: { in: chunk }, businessId },
      });
    }
    return matching.length;
  }

  private fullDayUnavailableWhere(
    businessId: string,
    userIds: string[],
    from: Date,
    to: Date,
  ): Prisma.StaffWorkExceptionWhereInput {
    return {
      businessId,
      userId: { in: userIds },
      date: { gte: from, lte: to },
      isUnavailable: true,
      startTime: null,
      endTime: null,
    };
  }

  /** Used by preview to identify rows that would be removed. */
  filterFullDayUnavailable(rows: StaffWorkException[]): StaffWorkException[] {
    return rows.filter(isFullDayUnavailable);
  }
}
