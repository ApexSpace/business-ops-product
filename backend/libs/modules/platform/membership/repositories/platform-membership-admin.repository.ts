import { Injectable } from '@nestjs/common';
import { PlatformMemberRole, PlatformMembership, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const platformUserInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },
} satisfies Prisma.PlatformMembershipInclude;

export type PlatformMembershipWithUser = Prisma.PlatformMembershipGetPayload<{
  include: typeof platformUserInclude;
}>;

@Injectable()
export class PlatformMembershipAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    skip: number,
    take: number,
    role?: PlatformMemberRole,
  ): Promise<{ items: PlatformMembershipWithUser[]; total: number }> {
    const where = {
      deletedAt: null,
      ...(role ? { role } : {}),
    };

    return Promise.all([
      this.prisma.platformMembership.findMany({
        where,
        include: platformUserInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.platformMembership.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findById(id: string): Promise<PlatformMembershipWithUser | null> {
    return this.prisma.platformMembership.findFirst({
      where: { id, deletedAt: null },
      include: platformUserInclude,
    });
  }

  findByUserId(userId: string): Promise<PlatformMembership | null> {
    return this.prisma.platformMembership.findFirst({
      where: { userId, deletedAt: null },
    });
  }

  create(data: {
    userId: string;
    role: PlatformMemberRole;
  }): Promise<PlatformMembershipWithUser> {
    return this.prisma.platformMembership.create({
      data,
      include: platformUserInclude,
    });
  }

  update(
    id: string,
    data: { role?: PlatformMemberRole },
  ): Promise<PlatformMembershipWithUser> {
    return this.prisma.platformMembership.update({
      where: { id },
      data,
      include: platformUserInclude,
    });
  }

  softDelete(id: string): Promise<PlatformMembership> {
    return this.prisma.platformMembership.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
