import { Injectable } from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

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
}

export { UserStatus };
