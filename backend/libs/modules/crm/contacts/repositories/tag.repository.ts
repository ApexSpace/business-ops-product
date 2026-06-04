import { Injectable } from '@nestjs/common';
import { Tag } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessId(businessId: string): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });
  }

  findByIds(businessId: string, ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.tag.findMany({
      where: { businessId, id: { in: ids } },
    });
  }

  findByName(businessId: string, name: string): Promise<Tag | null> {
    return this.prisma.tag.findFirst({
      where: {
        businessId,
        name: { equals: name, mode: 'insensitive' },
      },
    });
  }

  create(businessId: string, name: string): Promise<Tag> {
    return this.prisma.tag.create({
      data: {
        name,
        business: { connect: { id: businessId } },
      },
    });
  }

  findById(businessId: string, id: string): Promise<Tag | null> {
    return this.prisma.tag.findFirst({
      where: { id, businessId },
    });
  }
}
