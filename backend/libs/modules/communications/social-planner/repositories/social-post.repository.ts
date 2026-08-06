import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SocialPostStatus, SocialPostTargetStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const socialPostInclude = {
  media: {
    include: { fileAsset: { select: { filename: true, mimeType: true } } },
    orderBy: { sortOrder: 'asc' },
  },
  targets: {
    include: {
      resource: { select: { id: true, name: true, externalId: true } },
      media: {
        include: {
          fileAsset: { select: { filename: true, mimeType: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.SocialPostInclude;

export type SocialPostWithRelations = Prisma.SocialPostGetPayload<{
  include: typeof socialPostInclude;
}>;

const socialPostTargetInclude = {
  socialPost: {
    include: {
      media: {
        include: { fileAsset: { select: { filename: true, mimeType: true } } },
        orderBy: { sortOrder: 'asc' },
      },
    },
  },
  resource: { select: { id: true, name: true, externalId: true } },
  media: {
    include: { fileAsset: { select: { filename: true, mimeType: true } } },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.SocialPostTargetInclude;

export type SocialPostTargetWithRelations = Prisma.SocialPostTargetGetPayload<{
  include: typeof socialPostTargetInclude;
}>;

export interface CreateSocialPostTargetInput {
  providerKey: string;
  integrationResourceId?: string | null;
  postType?: string;
  platformPayload?: Prisma.InputJsonValue;
}

export interface CreateSocialPostInput {
  caption: string;
  timezone?: string | null;
  category?: string | null;
  tags?: string[];
  status?: SocialPostStatus;
  mediaFileAssetIds?: string[];
  targets: CreateSocialPostTargetInput[];
}

@Injectable()
export class SocialPostRepository {
  private readonly logger = new Logger(SocialPostRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.SocialPostWhereInput,
  ): Prisma.SocialPostWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<SocialPostWithRelations | null> {
    return this.prisma.socialPost.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: socialPostInclude,
    });
  }

  /** Cross-business lookup used by internal rollups/processors that already own the id. */
  findByIdUnscoped(id: string): Promise<SocialPostWithRelations | null> {
    return this.prisma.socialPost.findFirst({
      where: { id, deletedAt: null },
      include: socialPostInclude,
    });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      status?: SocialPostStatus;
      providerKey?: string;
      from?: Date;
      to?: Date;
    },
  ): Promise<{ items: SocialPostWithRelations[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(params.status ? { status: params.status } : {}),
      ...(params.providerKey
        ? { targets: { some: { providerKey: params.providerKey } } }
        : {}),
      ...(params.from || params.to
        ? {
            scheduledAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    });

    return Promise.all([
      this.prisma.socialPost.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
        include: socialPostInclude,
      }),
      this.prisma.socialPost.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  calendar(
    businessId: string,
    from: Date,
    to: Date,
  ): Promise<SocialPostWithRelations[]> {
    return this.prisma.socialPost.findMany({
      where: this.activeWhere(businessId, {
        scheduledAt: { gte: from, lte: to },
      }),
      orderBy: { scheduledAt: 'asc' },
      include: socialPostInclude,
    });
  }

  create(
    businessId: string,
    data: CreateSocialPostInput,
    createdByUserId: string,
  ): Promise<SocialPostWithRelations> {
    return this.prisma.socialPost.create({
      data: {
        business: { connect: { id: businessId } },
        createdBy: { connect: { id: createdByUserId } },
        caption: data.caption,
        timezone: data.timezone,
        category: data.category,
        tags: data.tags ?? [],
        status: data.status ?? SocialPostStatus.DRAFT,
        media: data.mediaFileAssetIds?.length
          ? {
              create: data.mediaFileAssetIds.map((fileAssetId, index) => ({
                fileAsset: { connect: { id: fileAssetId } },
                sortOrder: index,
              })),
            }
          : undefined,
        targets: {
          create: data.targets.map((target) => ({
            providerKey: target.providerKey,
            resource: target.integrationResourceId
              ? { connect: { id: target.integrationResourceId } }
              : undefined,
            postType: target.postType ?? 'FEED',
            platformPayload: target.platformPayload ?? {},
          })),
        },
      },
      include: socialPostInclude,
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.SocialPostUpdateInput,
  ): Promise<SocialPostWithRelations | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) return null;
    return this.prisma.socialPost.update({
      where: { id },
      data,
      include: socialPostInclude,
    });
  }

  /** Replaces media + targets in a transaction (used on full compose edits). */
  async replaceMediaAndTargets(
    businessId: string,
    id: string,
    data: {
      mediaFileAssetIds?: string[];
      targets?: CreateSocialPostTargetInput[];
    },
  ): Promise<SocialPostWithRelations | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) return null;

    await this.prisma.$transaction(async (tx) => {
      if (data.mediaFileAssetIds) {
        await tx.socialPostMedia.deleteMany({ where: { socialPostId: id } });
        if (data.mediaFileAssetIds.length > 0) {
          await tx.socialPostMedia.createMany({
            data: data.mediaFileAssetIds.map((fileAssetId, index) => ({
              socialPostId: id,
              fileAssetId,
              sortOrder: index,
            })),
          });
        }
      }

      if (data.targets) {
        await tx.socialPostTarget.deleteMany({ where: { socialPostId: id } });
        for (const target of data.targets) {
          await tx.socialPostTarget.create({
            data: {
              socialPostId: id,
              providerKey: target.providerKey,
              integrationResourceId: target.integrationResourceId ?? null,
              postType: target.postType ?? 'FEED',
              platformPayload: target.platformPayload ?? {},
            },
          });
        }
      }
    });

    return this.findById(businessId, id);
  }

  async softDelete(businessId: string, id: string): Promise<boolean> {
    const existing = await this.findById(businessId, id);
    if (!existing) return false;
    await this.prisma.socialPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }

  findTargetById(
    businessId: string,
    targetId: string,
  ): Promise<SocialPostTargetWithRelations | null> {
    return this.prisma.socialPostTarget.findFirst({
      where: { id: targetId, socialPost: { businessId, deletedAt: null } },
      include: socialPostTargetInclude,
    });
  }

  updateTarget(
    targetId: string,
    data: Prisma.SocialPostTargetUpdateInput,
  ): Promise<SocialPostTargetWithRelations> {
    return this.prisma.socialPostTarget.update({
      where: { id: targetId },
      data,
      include: socialPostTargetInclude,
    });
  }

  updateManyTargetsForPost(
    socialPostId: string,
    where: Prisma.SocialPostTargetWhereInput,
    data: Prisma.SocialPostTargetUpdateManyMutationInput,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.socialPostTarget.updateMany({
      where: { ...where, socialPostId },
      data,
    });
  }

  /**
   * Recomputes the parent SocialPost.status from its targets' statuses.
   * Safe to call from both the API side (after cancel/schedule) and the
   * worker side (after a target finishes publishing) without creating a
   * circular dependency between the two services.
   */
  async rollupParentStatus(socialPostId: string): Promise<void> {
    const post = await this.findByIdUnscoped(socialPostId);
    if (!post) {
      this.logger.warn(`Cannot roll up status for missing post ${socialPostId}`);
      return;
    }

    const statuses = post.targets.map((t) => t.status);
    let status: SocialPostStatus;

    if (statuses.length === 0) {
      status = SocialPostStatus.DRAFT;
    } else if (statuses.every((s) => s === SocialPostTargetStatus.PUBLISHED)) {
      status = SocialPostStatus.PUBLISHED;
    } else if (
      statuses.some((s) => s === SocialPostTargetStatus.PUBLISHED) &&
      statuses.some(
        (s) =>
          s === SocialPostTargetStatus.FAILED ||
          s === SocialPostTargetStatus.CANCELLED,
      )
    ) {
      status = SocialPostStatus.PARTIAL;
    } else if (statuses.every((s) => s === SocialPostTargetStatus.CANCELLED)) {
      status = SocialPostStatus.CANCELLED;
    } else if (statuses.every((s) => s === SocialPostTargetStatus.FAILED)) {
      status = SocialPostStatus.FAILED;
    } else if (statuses.some((s) => s === SocialPostTargetStatus.PUBLISHING)) {
      status = SocialPostStatus.PUBLISHING;
    } else if (statuses.some((s) => s === SocialPostTargetStatus.SCHEDULED)) {
      status = SocialPostStatus.SCHEDULED;
    } else {
      status = SocialPostStatus.DRAFT;
    }

    const allSettled = statuses.every(
      (s) =>
        s === SocialPostTargetStatus.PUBLISHED ||
        s === SocialPostTargetStatus.FAILED ||
        s === SocialPostTargetStatus.CANCELLED,
    );

    await this.prisma.socialPost.update({
      where: { id: socialPostId },
      data: {
        status,
        ...(allSettled && !post.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
  }

  /** Platform-wide (cross-business) — used by the safety-net cron. */
  findDueScheduledTargets(cutoff: Date, take = 200): Promise<
    Array<{ id: string; socialPost: { businessId: string } }>
  > {
    return this.prisma.socialPostTarget.findMany({
      where: {
        status: SocialPostTargetStatus.SCHEDULED,
        scheduledAt: { lte: cutoff },
        externalPostId: null,
        socialPost: { deletedAt: null },
      },
      select: { id: true, socialPost: { select: { businessId: true } } },
      take,
    });
  }
}
