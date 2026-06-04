import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PostgresSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchContacts(
    businessId: string,
    query: string,
    limit = 20,
  ) {
    const q = query.trim();
    if (!q) return [];

    return this.prisma.$queryRaw<
      Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null }>
    >`
      SELECT id, "firstName", "lastName", email
      FROM contacts
      WHERE "businessId" = ${businessId}
        AND "deletedAt" IS NULL
        AND (
          COALESCE("firstName", '') || ' ' || COALESCE("lastName", '') ILIKE ${`%${q}%`}
          OR email ILIKE ${`%${q}%`}
          OR "phoneNumber" ILIKE ${`%${q}%`}
        )
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;
  }

  async searchConversations(
    businessId: string,
    query: string,
    limit = 20,
  ) {
    const q = query.trim();
    if (!q) return [];

    return this.prisma.conversation.findMany({
      where: {
        businessId,
        deletedAt: null,
        lastMessagePreview: { contains: q, mode: Prisma.QueryMode.insensitive },
      },
      take: limit,
      orderBy: { lastMessageAt: 'desc' },
    });
  }
}
