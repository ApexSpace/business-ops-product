import { Injectable } from '@nestjs/common';
import { Prisma, SocialPostTargetStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export interface UpsertSocialCommentInput {
  businessId: string;
  socialPostTargetId: string;
  providerKey: string;
  externalCommentId: string;
  parentExternalCommentId?: string | null;
  parentCommentId?: string | null;
  authorName?: string | null;
  authorExternalId?: string | null;
  message?: string;
  likeCount?: number;
  externalCreatedAt?: Date | null;
  isRead?: boolean;
  deletedAt?: Date | null;
}

@Injectable()
export class SocialCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByExternalId(providerKey: string, externalCommentId: string) {
    return this.prisma.socialComment.findUnique({
      where: {
        providerKey_externalCommentId: { providerKey, externalCommentId },
      },
      include: {
        target: {
          include: {
            socialPost: true,
            resource: { select: { id: true, name: true, externalId: true } },
            metrics: true,
          },
        },
      },
    });
  }

  findById(businessId: string, id: string) {
    return this.prisma.socialComment.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        target: {
          include: {
            socialPost: true,
            resource: { select: { id: true, name: true, externalId: true } },
            metrics: true,
          },
        },
      },
    });
  }

  async upsertComment(input: UpsertSocialCommentInput) {
    const existing = await this.prisma.socialComment.findUnique({
      where: {
        providerKey_externalCommentId: {
          providerKey: input.providerKey,
          externalCommentId: input.externalCommentId,
        },
      },
    });

    if (existing) {
      return this.prisma.socialComment.update({
        where: { id: existing.id },
        data: {
          message: input.message ?? existing.message,
          authorName: input.authorName ?? existing.authorName,
          authorExternalId: input.authorExternalId ?? existing.authorExternalId,
          likeCount: input.likeCount ?? existing.likeCount,
          parentExternalCommentId:
            input.parentExternalCommentId ?? existing.parentExternalCommentId,
          parentCommentId: input.parentCommentId ?? existing.parentCommentId,
          externalCreatedAt:
            input.externalCreatedAt ?? existing.externalCreatedAt,
          lastSyncedAt: new Date(),
          deletedAt:
            input.deletedAt === undefined ? existing.deletedAt : input.deletedAt,
          ...(input.isRead !== undefined ? { isRead: input.isRead } : {}),
        },
      });
    }

    return this.prisma.socialComment.create({
      data: {
        businessId: input.businessId,
        socialPostTargetId: input.socialPostTargetId,
        providerKey: input.providerKey,
        externalCommentId: input.externalCommentId,
        parentExternalCommentId: input.parentExternalCommentId ?? null,
        parentCommentId: input.parentCommentId ?? null,
        authorName: input.authorName ?? null,
        authorExternalId: input.authorExternalId ?? null,
        message: input.message ?? '',
        likeCount: input.likeCount ?? 0,
        isRead: input.isRead ?? false,
        externalCreatedAt: input.externalCreatedAt ?? null,
        lastSyncedAt: new Date(),
        deletedAt: input.deletedAt ?? null,
      },
    });
  }

  softDeleteByExternalId(providerKey: string, externalCommentId: string) {
    return this.prisma.socialComment.updateMany({
      where: { providerKey, externalCommentId, deletedAt: null },
      data: { deletedAt: new Date(), lastSyncedAt: new Date() },
    });
  }

  softDeleteByExternalIdCascade(
    providerKey: string,
    externalCommentId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.socialComment.findUnique({
        where: {
          providerKey_externalCommentId: { providerKey, externalCommentId },
        },
      });
      if (!parent || parent.deletedAt) return { count: 0 };

      const now = new Date();
      const children = await tx.socialComment.updateMany({
        where: {
          providerKey,
          deletedAt: null,
          OR: [
            { parentExternalCommentId: externalCommentId },
            { parentCommentId: parent.id },
          ],
        },
        data: { deletedAt: now, lastSyncedAt: now },
      });
      const self = await tx.socialComment.updateMany({
        where: { id: parent.id, deletedAt: null },
        data: { deletedAt: now, lastSyncedAt: now },
      });
      return { count: children.count + self.count };
    });
  }

  softDeleteMissingExternalIds(
    socialPostTargetId: string,
    keepExternalIds: string[],
  ) {
    return this.prisma.socialComment.updateMany({
      where: {
        socialPostTargetId,
        deletedAt: null,
        ...(keepExternalIds.length > 0
          ? { externalCommentId: { notIn: keepExternalIds } }
          : {}),
      },
      data: { deletedAt: new Date(), lastSyncedAt: new Date() },
    });
  }

  listForBusiness(
    businessId: string,
    params: {
      providerKey?: string;
      socialPostId?: string;
      unreadOnly?: boolean;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const where: Prisma.SocialCommentWhereInput = {
      businessId,
      deletedAt: null,
      // Include replies — listForBusiness builds the tree via buildCommentForest.
      // Filtering parentCommentId: null here drops every nested comment from the API.
      ...(params.providerKey ? { providerKey: params.providerKey } : {}),
      ...(params.unreadOnly ? { isRead: false } : {}),
      ...(params.search
        ? {
            OR: [
              { message: { contains: params.search, mode: 'insensitive' } },
              { authorName: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.socialPostId
        ? { target: { socialPostId: params.socialPostId } }
        : {}),
    };

    // Flat rows (with parentCommentId) — callers build the reply tree.
    // Do not include `replies` here: that only loads one level and duplicates
    // child rows as top-level when the where clause is not parent-scoped.
    return Promise.all([
      this.prisma.socialComment.findMany({
        where,
        skip: params.skip ?? 0,
        take: params.take ?? 100,
        orderBy: [{ externalCreatedAt: 'asc' }, { createdAt: 'asc' }],
        include: {
          target: {
            include: {
              socialPost: true,
              resource: { select: { id: true, name: true, externalId: true } },
              metrics: true,
            },
          },
        },
      }),
      this.prisma.socialComment.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  markRead(businessId: string, ids: string[]) {
    return this.prisma.socialComment.updateMany({
      where: { businessId, id: { in: ids }, deletedAt: null },
      data: { isRead: true },
    });
  }

  markAllRead(
    businessId: string,
    filters: { providerKey?: string; socialPostId?: string },
  ) {
    return this.prisma.socialComment.updateMany({
      where: {
        businessId,
        deletedAt: null,
        isRead: false,
        ...(filters.providerKey ? { providerKey: filters.providerKey } : {}),
        ...(filters.socialPostId
          ? { target: { socialPostId: filters.socialPostId } }
          : {}),
      },
      data: { isRead: true },
    });
  }

  unreadCount(businessId: string, providerKey?: string) {
    return this.prisma.socialComment.count({
      where: {
        businessId,
        deletedAt: null,
        isRead: false,
        ...(providerKey ? { providerKey } : {}),
      },
    });
  }

  findPublishedTargetsForEngagement(params: {
    businessId?: string;
    providerKeys: string[];
    take?: number;
  }) {
    return this.prisma.socialPostTarget.findMany({
      where: {
        status: SocialPostTargetStatus.PUBLISHED,
        externalPostId: { not: null },
        providerKey: { in: params.providerKeys },
        socialPost: {
          deletedAt: null,
          ...(params.businessId ? { businessId: params.businessId } : {}),
        },
      },
      include: {
        socialPost: true,
        resource: { select: { id: true, name: true, externalId: true } },
        metrics: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: params.take ?? 50,
    });
  }

  findTargetById(businessId: string, targetId: string) {
    return this.prisma.socialPostTarget.findFirst({
      where: {
        id: targetId,
        socialPost: { businessId, deletedAt: null },
      },
      include: {
        socialPost: true,
        resource: { select: { id: true, name: true, externalId: true } },
        metrics: true,
      },
    });
  }

  findTargetByExternalPostId(
    businessId: string,
    providerKey: string,
    externalPostId: string,
  ) {
    return this.prisma.socialPostTarget.findFirst({
      where: {
        providerKey,
        externalPostId,
        status: SocialPostTargetStatus.PUBLISHED,
        socialPost: { businessId, deletedAt: null },
      },
      include: {
        socialPost: true,
        resource: { select: { id: true, name: true, externalId: true } },
        metrics: true,
      },
    });
  }

  findTargetByExternalPostIdUnscoped(
    providerKey: string,
    externalPostId: string,
  ) {
    return this.prisma.socialPostTarget.findFirst({
      where: {
        providerKey,
        OR: [
          { externalPostId },
          { externalPostId: { endsWith: `_${externalPostId}` } },
          { externalPostId: { startsWith: `${externalPostId}_` } },
        ],
        status: SocialPostTargetStatus.PUBLISHED,
        socialPost: { deletedAt: null },
      },
      include: {
        socialPost: true,
        resource: { select: { id: true, name: true, externalId: true } },
        metrics: true,
      },
    });
  }

  upsertMetrics(
    socialPostTargetId: string,
    data: {
      likes: number;
      comments: number;
      shares: number;
      reach: number;
      impressions: number;
      views: number;
      rawJson?: Prisma.InputJsonValue;
    },
  ) {
    return this.prisma.socialPostMetrics.upsert({
      where: { socialPostTargetId },
      create: {
        socialPostTargetId,
        ...data,
        syncedAt: new Date(),
      },
      update: {
        ...data,
        syncedAt: new Date(),
      },
    });
  }

  updateTargetPermalink(targetId: string, permalink: string) {
    return this.prisma.socialPostTarget.update({
      where: { id: targetId },
      data: { permalink },
    });
  }
}
