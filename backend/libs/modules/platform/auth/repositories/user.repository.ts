import { Injectable } from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const userWithRelations = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: {
    platformMembership: true,
    businessMemberships: {
      where: { deletedAt: null },
      include: { business: true },
    },
  },
});

export type UserWithRelations = Prisma.UserGetPayload<typeof userWithRelations>;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: { id },
      ...userWithRelations,
    });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  updateLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  updatePassword(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  setPasswordResetToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });
  }

  findByPasswordResetTokenHash(tokenHash: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { passwordResetTokenHash: tokenHash },
    });
  }

  clearPasswordResetToken(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
  }

  updatePasswordAndClearResetToken(
    id: string,
    passwordHash: string,
    expectedTokenHash: string,
  ): Promise<number> {
    return this.prisma.user
      .updateMany({
        where: {
          id,
          passwordResetTokenHash: expectedTokenHash,
          passwordResetExpiresAt: { gt: new Date() },
        },
        data: {
          passwordHash,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      })
      .then((result) => result.count);
  }

  setEmailVerifiedAt(id: string, verifiedAt: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { emailVerifiedAt: verifiedAt },
    });
  }
}

export { UserStatus };
