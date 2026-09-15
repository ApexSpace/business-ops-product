import { Injectable, Logger } from '@nestjs/common';
import { SocialCommentRepository } from '../repositories/social-comment.repository';

interface FeedCommentValue {
  item?: string;
  verb?: string;
  comment_id?: string;
  post_id?: string;
  parent_id?: string;
  message?: string;
  created_time?: number | string;
  from?: { id?: string; name?: string };
  photo_id?: string;
  video_id?: string;
}

interface InstagramCommentValue {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string };
  parent_id?: string;
}

/**
 * Ingests Meta Page feed / Instagram comment webhooks into SocialComment
 * only when the post maps to a Social Planner–published target.
 */
@Injectable()
export class SocialCommentIngestionService {
  private readonly logger = new Logger(SocialCommentIngestionService.name);

  constructor(
    private readonly commentRepository: SocialCommentRepository,
  ) {}

  /**
   * @returns true when the payload contained at least one feed/comment change
   * (processed or intentionally ignored for non-planner posts).
   */
  async processMetaPayload(body: Record<string, unknown>): Promise<boolean> {
    const object = body.object as string | undefined;
    const entries = Array.isArray(body.entry) ? body.entry : [];
    let handled = false;

    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const entryObj = entry as {
        id?: string;
        changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
      };

      for (const change of entryObj.changes ?? []) {
        const field = change.field;
        const value = change.value ?? {};

        if (object === 'page' && field === 'feed') {
          handled = true;
          await this.handlePageFeedChange(entryObj.id, value as FeedCommentValue);
        }

        if (
          (object === 'instagram' || object === 'page') &&
          (field === 'comments' || field === 'live_comments')
        ) {
          handled = true;
          await this.handleInstagramCommentChange(
            entryObj.id,
            value as InstagramCommentValue,
          );
        }
      }
    }

    return handled;
  }

  private async handlePageFeedChange(
    pageId: string | undefined,
    value: FeedCommentValue,
  ): Promise<void> {
    if (value.item !== 'comment' || !value.comment_id) {
      return;
    }

    const postId =
      value.post_id ??
      value.parent_id ??
      value.photo_id ??
      value.video_id ??
      null;
    if (!postId) {
      this.logger.debug('Page feed comment missing post id — ignored');
      return;
    }

    const target =
      (await this.commentRepository.findTargetByExternalPostIdUnscoped(
        'facebook',
        postId,
      )) ??
      (await this.commentRepository.findTargetByExternalPostIdUnscoped(
        'instagram',
        postId,
      ));

    if (!target) {
      this.logger.debug(
        `Ignoring feed comment for non-planner post pageId=${pageId} postId=${postId}`,
      );
      return;
    }

    if (value.verb === 'remove' || value.verb === 'delete') {
      await this.commentRepository.softDeleteByExternalId(
        target.providerKey,
        value.comment_id,
      );
      return;
    }

    let parentCommentId: string | null = null;
    const parentExternal =
      value.parent_id && value.parent_id !== postId ? value.parent_id : null;
    if (parentExternal) {
      const parent = await this.commentRepository.findByExternalId(
        target.providerKey,
        parentExternal,
      );
      parentCommentId = parent?.id ?? null;
    }

    const createdAt =
      typeof value.created_time === 'number'
        ? new Date(value.created_time * 1000)
        : value.created_time
          ? new Date(value.created_time)
          : new Date();

    await this.commentRepository.upsertComment({
      businessId: target.socialPost.businessId,
      socialPostTargetId: target.id,
      providerKey: target.providerKey,
      externalCommentId: value.comment_id,
      parentExternalCommentId: parentExternal,
      parentCommentId,
      authorName: value.from?.name ?? null,
      authorExternalId: value.from?.id ?? null,
      message: value.message ?? '',
      externalCreatedAt: createdAt,
      isRead: false,
      deletedAt: null,
    });
  }

  private async handleInstagramCommentChange(
    igUserId: string | undefined,
    value: InstagramCommentValue,
  ): Promise<void> {
    const commentId = value.id;
    const mediaId = value.media?.id;
    if (!commentId || !mediaId) {
      return;
    }

    const target =
      await this.commentRepository.findTargetByExternalPostIdUnscoped(
        'instagram',
        mediaId,
      );
    if (!target) {
      this.logger.debug(
        `Ignoring IG comment for non-planner media igUserId=${igUserId} mediaId=${mediaId}`,
      );
      return;
    }

    let parentCommentId: string | null = null;
    if (value.parent_id) {
      const parent = await this.commentRepository.findByExternalId(
        'instagram',
        value.parent_id,
      );
      parentCommentId = parent?.id ?? null;
    }

    await this.commentRepository.upsertComment({
      businessId: target.socialPost.businessId,
      socialPostTargetId: target.id,
      providerKey: 'instagram',
      externalCommentId: commentId,
      parentExternalCommentId: value.parent_id ?? null,
      parentCommentId,
      authorName: value.from?.username ?? null,
      authorExternalId: value.from?.id ?? null,
      message: value.text ?? '',
      externalCreatedAt: new Date(),
      isRead: false,
      deletedAt: null,
    });
  }
}
