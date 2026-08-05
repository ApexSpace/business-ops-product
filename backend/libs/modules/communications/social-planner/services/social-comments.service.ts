import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { SocialCommentRepository } from '../repositories/social-comment.repository';
import { SocialEngagementAdapterRegistry } from '../engagement/social-engagement.registry';
import type { SocialEngagementComment } from '../engagement/social-engagement-adapter.interface';
import { buildCommentForest } from '../utils/build-comment-forest.util';
import { SocialTokenResolverService } from './social-token-resolver.service';

export interface SocialCommentDto {
  id: string;
  externalCommentId: string;
  message: string;
  fromName: string | null;
  createdTime: string | null;
  likeCount: number;
  isRead: boolean;
  providerKey: string;
  externalPostId: string;
  socialPostTargetId: string;
  permalink: string | null;
  replies: SocialCommentDto[];
}

export interface SocialEngagementPostGroupDto {
  socialPostId: string;
  socialPostTargetId: string;
  providerKey: string;
  externalPostId: string;
  permalink: string | null;
  resourceName: string | null;
  captionPreview: string;
  publishedAt: string | null;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  } | null;
  capabilities: {
    reply: boolean;
    likeComment: boolean;
    deleteComment: boolean;
  };
  comments: SocialCommentDto[];
}

export interface SocialEngagementListResult {
  items: SocialEngagementPostGroupDto[];
  totalComments: number;
  unreadCount: number;
  warnings: string[];
}

@Injectable()
export class SocialCommentsService {
  private readonly logger = new Logger(SocialCommentsService.name);

  constructor(
    private readonly commentRepository: SocialCommentRepository,
    private readonly engagementRegistry: SocialEngagementAdapterRegistry,
    private readonly tokenResolver: SocialTokenResolverService,
  ) {}

  async listForBusiness(
    businessId: string,
    query: {
      providerKey?: string;
      socialPostId?: string;
      unreadOnly?: boolean;
      search?: string;
      refresh?: boolean;
      limit?: number;
    } = {},
  ): Promise<SocialEngagementListResult> {
    const warnings: string[] = [];
    const providerKeys = query.providerKey
      ? [query.providerKey]
      : this.engagementRegistry.listProviderKeys();

    for (const key of providerKeys) {
      if (!this.engagementRegistry.hasAdapter(key)) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          `Engagement is not supported for ${key}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Optional live reconcile (webhooks + cron are the primary feed path).
    if (query.refresh === true) {
      try {
        await this.reconcileBusinessTargets(businessId, {
          providerKey: query.providerKey,
          socialPostId: query.socialPostId,
          take: 20,
          warnings,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Reconcile failed';
        warnings.push(message);
        this.logger.warn(`Engagement reconcile warning: ${message}`);
      }
    }

    const { items: comments, total } =
      await this.commentRepository.listForBusiness(businessId, {
        providerKey: query.providerKey,
        socialPostId: query.socialPostId,
        unreadOnly: query.unreadOnly,
        search: query.search,
        take: query.limit ?? 200,
      });

    const unreadCount = await this.commentRepository.unreadCount(
      businessId,
      query.providerKey,
    );

    // Group flat rows by target, then rebuild reply trees so reply-to-reply
    // nesting is preserved (Prisma include.replies is only one level deep).
    const byTarget = new Map<string, typeof comments>();
    for (const comment of comments) {
      const key = comment.socialPostTargetId;
      const list = byTarget.get(key);
      if (list) list.push(comment);
      else byTarget.set(key, [comment]);
    }

    const groups: SocialEngagementPostGroupDto[] = [];
    for (const targetComments of byTarget.values()) {
      const sample = targetComments[0]!;
      const target = sample.target;
      const externalPostId = target.externalPostId ?? '';
      const adapter = this.engagementRegistry.getAdapter(sample.providerKey);
      const forest = buildCommentForest(
        targetComments.map((c) => ({
          ...c,
          parentCommentId: c.parentCommentId,
        })),
      );

      groups.push({
        socialPostId: target.socialPostId,
        socialPostTargetId: target.id,
        providerKey: sample.providerKey,
        externalPostId,
        permalink: target.permalink,
        resourceName: target.resource?.name ?? null,
        captionPreview: (target.socialPost.caption ?? '').slice(0, 160),
        publishedAt: target.publishedAt?.toISOString() ?? null,
        metrics: target.metrics
          ? {
              likes: target.metrics.likes,
              comments: target.metrics.comments,
              shares: target.metrics.shares,
              views: target.metrics.views,
            }
          : null,
        capabilities: {
          reply: adapter?.capabilities.reply ?? false,
          likeComment: adapter?.capabilities.likeComment ?? false,
          deleteComment: adapter?.capabilities.deleteComment ?? false,
        },
        comments: forest.map((node) => this.toDto(node)),
      });
    }

    const items = groups;
    await this.backfillInstagramPermalinks(businessId, items, warnings);

    return {
      // Flat shape without a nested `meta` key — TransformInterceptor treats
      // `{ items, meta }` as a paginated list and would strip the payload.
      items,
      totalComments: total,
      unreadCount,
      warnings,
    };
  }

  /**
   * Older publishes stored `instagram.com/p/{graphMediaId}` which is not a valid
   * public URL. Fetch the real shortcode permalink and persist it.
   */
  private async backfillInstagramPermalinks(
    businessId: string,
    items: SocialEngagementPostGroupDto[],
    warnings: string[],
  ): Promise<void> {
    const igAdapter = this.engagementRegistry.getAdapter('instagram');
    if (!igAdapter?.fetchPermalink) {
      return;
    }

    for (const group of items) {
      if (group.providerKey !== 'instagram' || !group.externalPostId) continue;
      if (!needsInstagramPermalinkBackfill(group.permalink, group.externalPostId)) {
        continue;
      }

      try {
        const target = await this.commentRepository.findTargetById(
          businessId,
          group.socialPostTargetId,
        );
        if (!target) continue;
        const accessToken = await this.tokenResolver.getAccessToken(
          businessId,
          'instagram',
          target.integrationResourceId,
        );
        const permalink = await igAdapter.fetchPermalink(
          group.externalPostId,
          accessToken,
        );
        if (!permalink) continue;
        await this.commentRepository.updateTargetPermalink(
          group.socialPostTargetId,
          permalink,
        );
        group.permalink = permalink;
      } catch (error) {
        warnings.push(
          `instagram permalink:${group.externalPostId}: ${
            error instanceof Error ? error.message : 'backfill failed'
          }`,
        );
      }
    }
  }

  async markRead(businessId: string, ids: string[]) {
    await this.commentRepository.markRead(businessId, ids);
    return { success: true as const };
  }

  async markAllRead(
    businessId: string,
    filters: { providerKey?: string; socialPostId?: string },
  ) {
    await this.commentRepository.markAllRead(businessId, filters);
    return { success: true as const };
  }

  async reply(
    businessId: string,
    commentId: string,
    providerKey: string,
    message: string,
    socialPostTargetId?: string,
  ): Promise<{ id: string }> {
    const adapter = this.requireAdapter(providerKey);
    if (!adapter.capabilities.reply) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Reply is not supported for ${providerKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const resolved = await this.resolveMutationContext(
      businessId,
      commentId,
      providerKey,
      socialPostTargetId,
    );

    const result = await adapter.reply({
      externalCommentId: resolved.externalCommentId,
      accessToken: resolved.accessToken,
      message,
    }).catch((error) => {
      throw new AppException(
        ErrorCode.SOCIAL_PUBLISH_FAILED,
        error instanceof Error ? error.message : 'Failed to reply to comment',
        HttpStatus.BAD_REQUEST,
      );
    });

    // Prefer UUID parent from the comment being replied to (already resolved).
    const parent =
      (await this.commentRepository.findById(businessId, commentId)) ??
      (await this.commentRepository.findByExternalId(
        providerKey,
        resolved.externalCommentId,
      ));

    await this.commentRepository.upsertComment({
      businessId,
      socialPostTargetId: resolved.targetId,
      providerKey,
      externalCommentId: result.id,
      parentExternalCommentId: resolved.externalCommentId,
      parentCommentId: parent?.id ?? null,
      message,
      authorName: null,
      likeCount: 0,
      isRead: true,
      externalCreatedAt: new Date(),
    });

    return result;
  }

  async like(
    businessId: string,
    commentId: string,
    providerKey: string,
    socialPostTargetId?: string,
  ): Promise<{ success: true }> {
    const adapter = this.requireAdapter(providerKey);
    if (!adapter.capabilities.likeComment || !adapter.likeComment) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Like is not supported for ${providerKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const resolved = await this.resolveMutationContext(
      businessId,
      commentId,
      providerKey,
      socialPostTargetId,
    );

    await adapter.likeComment({
      externalCommentId: resolved.externalCommentId,
      accessToken: resolved.accessToken,
    });

    const existing = await this.commentRepository.findByExternalId(
      providerKey,
      resolved.externalCommentId,
    );
    if (existing) {
      await this.commentRepository.upsertComment({
        businessId,
        socialPostTargetId: existing.socialPostTargetId,
        providerKey,
        externalCommentId: resolved.externalCommentId,
        likeCount: existing.likeCount + 1,
      });
    }

    return { success: true };
  }

  async delete(
    businessId: string,
    commentId: string,
    providerKey: string,
    socialPostTargetId?: string,
  ): Promise<{ success: true }> {
    const adapter = this.requireAdapter(providerKey);
    if (!adapter.capabilities.deleteComment) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Delete is not supported for ${providerKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const resolved = await this.resolveMutationContext(
      businessId,
      commentId,
      providerKey,
      socialPostTargetId,
    );

    await adapter.deleteComment({
      externalCommentId: resolved.externalCommentId,
      accessToken: resolved.accessToken,
    });

    await this.commentRepository.softDeleteByExternalId(
      providerKey,
      resolved.externalCommentId,
    );

    return { success: true };
  }

  /** Upsert a provider comment tree into SocialComment for a known target. */
  async persistCommentTree(
    businessId: string,
    socialPostTargetId: string,
    providerKey: string,
    comments: SocialEngagementComment[],
    parentDbId: string | null = null,
  ): Promise<number> {
    let count = 0;
    for (const comment of comments) {
      if (!comment.externalCommentId) continue;
      const row = await this.commentRepository.upsertComment({
        businessId,
        socialPostTargetId,
        providerKey,
        externalCommentId: comment.externalCommentId,
        parentExternalCommentId: comment.parentExternalCommentId,
        parentCommentId: parentDbId,
        authorName: comment.authorName,
        authorExternalId: comment.authorExternalId,
        message: comment.message,
        likeCount: comment.likeCount,
        externalCreatedAt: comment.createdTime
          ? new Date(comment.createdTime)
          : null,
      });
      count += 1;
      if (comment.replies?.length) {
        count += await this.persistCommentTree(
          businessId,
          socialPostTargetId,
          providerKey,
          comment.replies,
          row.id,
        );
      }
    }
    return count;
  }

  async reconcileBusinessTargets(
    businessId: string,
    options: {
      providerKey?: string;
      socialPostId?: string;
      take?: number;
      warnings?: string[];
    } = {},
  ): Promise<number> {
    const providerKeys = options.providerKey
      ? [options.providerKey]
      : this.engagementRegistry.listProviderKeys();

    let targets =
      await this.commentRepository.findPublishedTargetsForEngagement({
        businessId,
        providerKeys,
        take: options.take ?? 20,
      });

    if (options.socialPostId) {
      targets = targets.filter((t) => t.socialPostId === options.socialPostId);
    }

    let upserted = 0;
    for (const target of targets) {
      try {
        upserted += await this.reconcileTarget(target);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Target reconcile failed';
        options.warnings?.push(
          `${target.providerKey}:${target.externalPostId}: ${message}`,
        );
        this.logger.warn(
          `Reconcile failed target=${target.id}: ${message}`,
        );
      }
    }
    return upserted;
  }

  async reconcileTarget(target: {
    id: string;
    providerKey: string;
    externalPostId: string | null;
    integrationResourceId: string | null;
    socialPost: { businessId: string };
    resource?: { externalId: string } | null;
  }): Promise<number> {
    if (!target.externalPostId) return 0;
    const adapter = this.engagementRegistry.getAdapter(target.providerKey);
    if (!adapter?.capabilities.listComments) return 0;

    const accessToken = await this.tokenResolver.getAccessToken(
      target.socialPost.businessId,
      target.providerKey,
      target.integrationResourceId,
    );

    const comments = await adapter.listComments({
      externalPostId: target.externalPostId,
      accessToken,
      externalResourceId: target.resource?.externalId,
    });

    return this.persistCommentTree(
      target.socialPost.businessId,
      target.id,
      target.providerKey,
      comments,
    );
  }

  private async resolveMutationContext(
    businessId: string,
    commentId: string,
    providerKey: string,
    socialPostTargetId?: string,
  ) {
    // commentId may be our UUID or the provider external id.
    let externalCommentId = commentId;
    let targetId = socialPostTargetId ?? null;
    let integrationResourceId: string | null = null;

    const byUuid = await this.commentRepository.findById(businessId, commentId);
    if (byUuid) {
      externalCommentId = byUuid.externalCommentId;
      targetId = byUuid.socialPostTargetId;
      integrationResourceId = byUuid.target.integrationResourceId;
    } else {
      const byExternal = await this.commentRepository.findByExternalId(
        providerKey,
        commentId,
      );
      if (byExternal && byExternal.businessId === businessId) {
        externalCommentId = byExternal.externalCommentId;
        targetId = byExternal.socialPostTargetId;
        integrationResourceId = byExternal.target.integrationResourceId;
      }
    }

    if (targetId && !integrationResourceId) {
      const target = await this.commentRepository.findTargetById(
        businessId,
        targetId,
      );
      integrationResourceId = target?.integrationResourceId ?? null;
    }

    if (!targetId) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Could not resolve social post target for this comment',
        HttpStatus.NOT_FOUND,
      );
    }

    const accessToken = await this.tokenResolver.getAccessToken(
      businessId,
      providerKey,
      integrationResourceId,
    );

    return {
      externalCommentId,
      targetId,
      accessToken,
      parentCommentId: byUuid?.id ?? null,
    };
  }

  private requireAdapter(providerKey: string) {
    const adapter = this.engagementRegistry.getAdapter(providerKey);
    if (!adapter) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Comments are only supported for ${this.engagementRegistry.listProviderKeys().join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return adapter;
  }

  private toDto(comment: {
    id: string;
    externalCommentId: string;
    message: string;
    authorName: string | null;
    externalCreatedAt: Date | null;
    likeCount: number;
    isRead: boolean;
    providerKey: string;
    socialPostTargetId: string;
    target: { externalPostId: string | null; permalink: string | null };
    replies?: Array<{
      id: string;
      externalCommentId: string;
      message: string;
      authorName: string | null;
      externalCreatedAt: Date | null;
      likeCount: number;
      isRead: boolean;
      providerKey: string;
      socialPostTargetId: string;
      target?: { externalPostId: string | null; permalink: string | null };
      replies?: unknown[];
    }>;
  }): SocialCommentDto {
    const externalPostId =
      comment.target?.externalPostId ??
      comment.replies?.[0]?.target?.externalPostId ??
      '';
    const permalink =
      comment.target?.permalink ?? comment.replies?.[0]?.target?.permalink ?? null;

    return {
      id: comment.id,
      externalCommentId: comment.externalCommentId,
      message: comment.message,
      fromName: comment.authorName,
      createdTime: comment.externalCreatedAt?.toISOString() ?? null,
      likeCount: comment.likeCount,
      isRead: comment.isRead,
      providerKey: comment.providerKey,
      externalPostId,
      socialPostTargetId: comment.socialPostTargetId,
      permalink,
      // Recurse — do not flatten deeper replies to [].
      replies: (comment.replies ?? []).map((reply) =>
        this.toDto({
          ...reply,
          target: reply.target ?? comment.target,
          replies: (reply.replies ?? []) as typeof comment.replies,
        }),
      ),
    };
  }
}

function needsInstagramPermalinkBackfill(
  permalink: string | null,
  externalPostId: string,
): boolean {
  if (!permalink) return true;
  const match = permalink.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/i);
  if (!match) return true;
  const slug = match[1];
  // Graph media ids are numeric; public URLs use alphanumeric shortcodes.
  return /^\d+$/.test(slug) || slug === externalPostId;
}
