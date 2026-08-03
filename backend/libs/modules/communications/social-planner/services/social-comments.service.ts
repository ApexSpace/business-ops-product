import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { SocialCommentRepository } from '../repositories/social-comment.repository';
import { SocialEngagementAdapterRegistry } from '../engagement/social-engagement.registry';
import type { SocialEngagementComment } from '../engagement/social-engagement-adapter.interface';
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
  meta: {
    totalComments: number;
    unreadCount: number;
    warnings: string[];
  };
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

    const groups = new Map<string, SocialEngagementPostGroupDto>();
    for (const comment of comments) {
      const target = comment.target;
      const externalPostId = target.externalPostId ?? '';
      const adapter = this.engagementRegistry.getAdapter(comment.providerKey);
      const key = target.id;
      if (!groups.has(key)) {
        groups.set(key, {
          socialPostId: target.socialPostId,
          socialPostTargetId: target.id,
          providerKey: comment.providerKey,
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
          comments: [],
        });
      }
      groups.get(key)!.comments.push(this.toDto(comment));
    }

    return {
      items: [...groups.values()],
      meta: {
        totalComments: total,
        unreadCount,
        warnings,
      },
    };
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
    });

    const parent = await this.commentRepository.findByExternalId(
      providerKey,
      resolved.externalCommentId,
    );

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
    }>;
  }): SocialCommentDto {
    return {
      id: comment.id,
      externalCommentId: comment.externalCommentId,
      message: comment.message,
      fromName: comment.authorName,
      createdTime: comment.externalCreatedAt?.toISOString() ?? null,
      likeCount: comment.likeCount,
      isRead: comment.isRead,
      providerKey: comment.providerKey,
      externalPostId: comment.target.externalPostId ?? '',
      socialPostTargetId: comment.socialPostTargetId,
      permalink: comment.target.permalink,
      replies: (comment.replies ?? []).map((reply) => ({
        id: reply.id,
        externalCommentId: reply.externalCommentId,
        message: reply.message,
        fromName: reply.authorName,
        createdTime: reply.externalCreatedAt?.toISOString() ?? null,
        likeCount: reply.likeCount,
        isRead: reply.isRead,
        providerKey: reply.providerKey,
        externalPostId: comment.target.externalPostId ?? '',
        socialPostTargetId: reply.socialPostTargetId,
        permalink: comment.target.permalink,
        replies: [],
      })),
    };
  }
}
