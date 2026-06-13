import { Injectable } from '@nestjs/common';
import { FileAsset, FileAssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type CreateFileAssetData = {
  id?: string;
  businessId: string;
  uploadedById?: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  category: Prisma.FileAssetCreateInput['category'];
  objectKey: string;
  visibility: Prisma.FileAssetCreateInput['visibility'];
};

@Injectable()
export class FileAssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.FileAssetWhereInput,
  ): Prisma.FileAssetWhereInput {
    return {
      businessId,
      deletedAt: null,
      ...extra,
    };
  }

  create(data: CreateFileAssetData): Promise<FileAsset> {
    const { id, ...rest } = data;
    return this.prisma.fileAsset.create({
      data: {
        ...rest,
        ...(id ? { id } : {}),
        status: FileAssetStatus.PENDING,
      },
    });
  }

  findById(businessId: string, id: string): Promise<FileAsset | null> {
    return this.prisma.fileAsset.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  findByIdIncludingDeleted(
    businessId: string,
    id: string,
  ): Promise<FileAsset | null> {
    return this.prisma.fileAsset.findFirst({
      where: { businessId, id },
    });
  }

  update(
    id: string,
    data: Prisma.FileAssetUpdateInput,
  ): Promise<FileAsset> {
    return this.prisma.fileAsset.update({ where: { id }, data });
  }

  findPendingOlderThan(cutoff: Date, take = 500): Promise<FileAsset[]> {
    return this.prisma.fileAsset.findMany({
      where: {
        status: FileAssetStatus.PENDING,
        createdAt: { lt: cutoff },
        deletedAt: null,
      },
      take,
    });
  }
}
