import { Injectable } from '@nestjs/common';
import { Prisma, Snapshot, SnapshotStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { DEFAULT_SNAPSHOT_ID } from '../seeds/snapshot-seed-definitions';

@Injectable()
export class SnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Snapshot | null> {
    return this.prisma.snapshot.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findPublishedById(id: string): Promise<Snapshot | null> {
    return this.prisma.snapshot.findFirst({
      where: { id, deletedAt: null, status: SnapshotStatus.PUBLISHED },
    });
  }

  findDefaultPublished(): Promise<Snapshot | null> {
    return this.findPublishedById(DEFAULT_SNAPSHOT_ID);
  }

  findMany(params: {
    skip: number;
    take: number;
    status?: SnapshotStatus;
  }): Promise<{
    items: Array<Snapshot & { _count: { businesses: number } }>;
    total: number;
  }> {
    const where: Prisma.SnapshotWhereInput = {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
    };

    return Promise.all([
      this.prisma.snapshot.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
        include: { _count: { select: { businesses: true } } },
      }),
      this.prisma.snapshot.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  create(data: Prisma.SnapshotCreateInput): Promise<Snapshot> {
    return this.prisma.snapshot.create({ data });
  }

  update(id: string, data: Prisma.SnapshotUpdateInput): Promise<Snapshot> {
    return this.prisma.snapshot.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Snapshot> {
    return this.prisma.snapshot.update({
      where: { id },
      data: { deletedAt: new Date(), status: SnapshotStatus.ARCHIVED },
    });
  }

  findProvision(businessId: string, snapshotId: string, sourceKey: string) {
    return this.prisma.snapshotProvision.findUnique({
      where: {
        businessId_snapshotId_sourceKey: {
          businessId,
          snapshotId,
          sourceKey,
        },
      },
    });
  }

  createProvision(data: Prisma.SnapshotProvisionCreateInput) {
    return this.prisma.snapshotProvision.create({ data });
  }

  countBusinesses(snapshotId: string): Promise<number> {
    return this.prisma.business.count({
      where: { snapshotId, deletedAt: null },
    });
  }
}
