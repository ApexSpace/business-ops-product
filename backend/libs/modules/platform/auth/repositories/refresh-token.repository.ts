import { Injectable } from '@nestjs/common';
import { AuthContextType, RefreshToken } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    contextType?: AuthContextType;
    businessId?: string;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        deletedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  revoke(id: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllForUser(userId: string): Promise<number> {
    return this.prisma.refreshToken
      .updateMany({
        where: { userId, revokedAt: null, deletedAt: null },
        data: { revokedAt: new Date() },
      })
      .then((r) => r.count);
  }
}
