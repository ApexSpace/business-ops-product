import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ConversationNotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByConversation(businessId: string, conversationId: string) {
    return this.prisma.conversationNote.findMany({
      where: { businessId, conversationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  create(data: Prisma.ConversationNoteCreateInput) {
    return this.prisma.conversationNote.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  softDelete(businessId: string, id: string) {
    return this.prisma.conversationNote.updateMany({
      where: { id, businessId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
