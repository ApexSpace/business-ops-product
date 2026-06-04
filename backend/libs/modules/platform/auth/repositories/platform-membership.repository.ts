import { Injectable } from '@nestjs/common';
import { PlatformMembership } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class PlatformMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByUserId(userId: string): Promise<PlatformMembership | null> {
    return this.prisma.platformMembership.findFirst({
      where: { userId, deletedAt: null },
    });
  }
}
