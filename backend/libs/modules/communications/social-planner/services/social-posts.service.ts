import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, SocialPostStatus, SocialPostTargetStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { QueueService } from '@app/core/queue/queue.service';
import { FileAssetRepository } from '@app/modules/storage/repositories/file-asset.repository';
import { SocialPublishAdapterRegistry } from '../adapters/social-publish.registry';
import type {
  SocialPublishInput,
  SocialPublishValidationIssue,
} from '../adapters/social-publish-adapter.interface';
import { CalendarQueryDto } from '../dto/calendar-query.dto';
import { CreateSocialPostDto } from '../dto/create-social-post.dto';
import { ListSocialPostsQueryDto } from '../dto/list-social-posts-query.dto';
import { ScheduleSocialPostDto } from '../dto/schedule-social-post.dto';
import { SocialPostResponseDto } from '../dto/social-post-response.dto';
import { UpdateSocialPostDto } from '../dto/update-social-post.dto';
import { ValidateSocialPostDto } from '../dto/validate-social-post.dto';
import { toSocialPostResponseDto } from '../mappers/social-post.mapper';
import {
  getAllPlatformSchemas,
  getPlatformSchema,
  isSupportedPlatformProviderKey,
  PlatformSchemaDefinition,
} from '../platform-schemas/platform-schema.registry';
import {
  SocialPostRepository,
  SocialPostWithRelations,
} from '../repositories/social-post.repository';
import {
  socialPublishJobId,
  socialPublishRetryJobId,
} from '../utils/social-publish-job-id.util';

export interface ComposeValidationTargetResult {
  providerKey: string;
  valid: boolean;
  issues: SocialPublishValidationIssue[];
}

export interface ComposeValidationResult {
  ok: boolean;
  targets: ComposeValidationTargetResult[];
}

type ComposeLikeDto = CreateSocialPostDto | ValidateSocialPostDto;

@Injectable()
export class SocialPostsService {
  constructor(
    private readonly socialPostRepository: SocialPostRepository,
    private readonly adapterRegistry: SocialPublishAdapterRegistry,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
    private readonly fileAssetRepository: FileAssetRepository,
  ) {}

  async create(
    businessId: string,
    dto: CreateSocialPostDto,
    actor: RequestUser,
  ): Promise<SocialPostResponseDto> {
    this.assertTargetsSupported(dto.targets.map((t) => t.providerKey));

    const created = await this.socialPostRepository.create(
      businessId,
      {
        caption: dto.caption,
        timezone: dto.timezone,
        category: dto.category,
        tags: dto.tags,
        mediaFileAssetIds: dto.mediaFileAssetIds,
        targets: dto.targets.map((target) => ({
          providerKey: target.providerKey,
          integrationResourceId: target.integrationResourceId ?? null,
          postType: target.postType,
          platformPayload: (target.platformPayload ?? {}) as Prisma.InputJsonValue,
        })),
      },
      actor.id,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'social_post.created',
      entityType: 'SocialPost',
      entityId: created.id,
    });

    return toSocialPostResponseDto(created);
  }

  async list(
    businessId: string,
    query: ListSocialPostsQueryDto,
  ): Promise<{
    items: SocialPostResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.socialPostRepository.findMany(
      businessId,
      {
        skip,
        take,
        status: query.status,
        providerKey: query.providerKey,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
    );

    return {
      items: items.map(toSocialPostResponseDto),
      meta: { total, page, limit },
    };
  }

  async getById(
    businessId: string,
    id: string,
  ): Promise<SocialPostResponseDto> {
    const post = await this.getEntityOrThrow(businessId, id);
    return toSocialPostResponseDto(post);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateSocialPostDto,
    actor: RequestUser,
  ): Promise<SocialPostResponseDto> {
    const existing = await this.getEntityOrThrow(businessId, id);
    this.assertEditable(existing);

    if (dto.targets) {
      this.assertTargetsSupported(dto.targets.map((t) => t.providerKey));
    }

    const data: Prisma.SocialPostUpdateInput = {};
    if (dto.caption !== undefined) data.caption = dto.caption;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.tags !== undefined) data.tags = dto.tags;

    if (Object.keys(data).length > 0) {
      await this.socialPostRepository.update(businessId, id, data);
    }

    if (dto.mediaFileAssetIds !== undefined || dto.targets !== undefined) {
      await this.socialPostRepository.replaceMediaAndTargets(businessId, id, {
        mediaFileAssetIds: dto.mediaFileAssetIds,
        targets: dto.targets?.map((target) => ({
          providerKey: target.providerKey,
          integrationResourceId: target.integrationResourceId ?? null,
          postType: target.postType,
          platformPayload: (target.platformPayload ?? {}) as Prisma.InputJsonValue,
        })),
      });
    }

    const updated = await this.getEntityOrThrow(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'social_post.updated',
      entityType: 'SocialPost',
      entityId: id,
      metadata: { ...dto },
    });

    return toSocialPostResponseDto(updated);
  }

  async softDelete(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<SocialPostResponseDto> {
    const existing = await this.getEntityOrThrow(businessId, id);

    for (const target of existing.targets) {
      if (target.status === SocialPostTargetStatus.SCHEDULED) {
        await this.queueService.removeSocialPublishJob(
          target.bullJobId ?? socialPublishJobId(target.id),
        );
      }
    }

    await this.socialPostRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'social_post.deleted',
      entityType: 'SocialPost',
      entityId: id,
    });

    return toSocialPostResponseDto(existing);
  }

  async validateCompose(
    businessId: string,
    dto: ComposeLikeDto,
  ): Promise<ComposeValidationResult> {
    const media = await this.resolveMediaForValidation(
      businessId,
      dto.mediaFileAssetIds ?? [],
    );

    const results: ComposeValidationTargetResult[] = dto.targets.map(
      (target) => {
        const providerKey = target.providerKey;
        const schema = getPlatformSchema(providerKey);
        if (!schema) {
          return {
            providerKey,
            valid: false,
            issues: [{ message: `Unsupported provider: ${providerKey}` }],
          };
        }

        const adapter = this.adapterRegistry.getAdapter(providerKey);
        if (!adapter) {
          return {
            providerKey,
            valid: false,
            issues: [
              { message: `No publish adapter registered for ${providerKey}` },
            ],
          };
        }

        const input = this.buildValidationInput(
          businessId,
          dto,
          target,
          schema,
          media,
        );
        const result = adapter.validate(input);
        return { providerKey, valid: result.valid, issues: result.issues };
      },
    );

    return { ok: results.every((r) => r.valid), targets: results };
  }

  private async resolveMediaForValidation(
    businessId: string,
    fileAssetIds: string[],
  ): Promise<SocialPublishInput['media']> {
    const assets = await Promise.all(
      fileAssetIds.map((id) => this.fileAssetRepository.findById(businessId, id)),
    );
    return assets
      .filter((asset): asset is NonNullable<typeof asset> => asset !== null)
      .map((asset) => ({
        url: '',
        mimeType: asset.mimeType,
        fileAssetId: asset.id,
      }));
  }

  async schedule(
    businessId: string,
    id: string,
    dto: ScheduleSocialPostDto,
    actor: RequestUser,
  ): Promise<SocialPostResponseDto> {
    return this.scheduleOrPublish(businessId, id, actor, {
      scheduledAt: new Date(dto.scheduledAt),
      timezone: dto.timezone,
    });
  }

  async publishNow(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<SocialPostResponseDto> {
    return this.scheduleOrPublish(businessId, id, actor, {
      scheduledAt: new Date(),
      timezone: undefined,
    });
  }

  async cancel(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<SocialPostResponseDto> {
    const existing = await this.getEntityOrThrow(businessId, id);

    if (
      existing.status === SocialPostStatus.PUBLISHED ||
      existing.status === SocialPostStatus.CANCELLED
    ) {
      throw new AppException(
        ErrorCode.SOCIAL_POST_INVALID_STATE,
        `Cannot cancel a post with status ${existing.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const target of existing.targets) {
      if (
        target.status === SocialPostTargetStatus.SCHEDULED ||
        target.status === SocialPostTargetStatus.DRAFT
      ) {
        await this.queueService.removeSocialPublishJob(
          target.bullJobId ?? socialPublishJobId(target.id),
        );
        await this.socialPostRepository.updateTarget(target.id, {
          status: SocialPostTargetStatus.CANCELLED,
        });
      }
    }

    await this.socialPostRepository.update(businessId, id, {
      status: SocialPostStatus.CANCELLED,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'social_post.cancelled',
      entityType: 'SocialPost',
      entityId: id,
    });

    return toSocialPostResponseDto(
      (await this.getEntityOrThrow(businessId, id)),
    );
  }

  async retryTarget(
    businessId: string,
    targetId: string,
    actor: RequestUser,
  ): Promise<SocialPostResponseDto> {
    const target = await this.socialPostRepository.findTargetById(
      businessId,
      targetId,
    );
    if (!target) {
      throw new AppException(
        ErrorCode.SOCIAL_POST_TARGET_NOT_FOUND,
        'Social post target not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (target.status !== SocialPostTargetStatus.FAILED) {
      throw new AppException(
        ErrorCode.SOCIAL_POST_INVALID_STATE,
        'Only failed targets can be retried',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.socialPostRepository.updateTarget(target.id, {
      status: SocialPostTargetStatus.SCHEDULED,
      scheduledAt: new Date(),
      errorCode: null,
      errorMessage: null,
    });

    await this.queueService.enqueueSocialPublish(
      { businessId, socialPostTargetId: target.id },
      { jobId: socialPublishRetryJobId(target.id) },
    );

    await this.socialPostRepository.update(businessId, target.socialPostId, {
      status: SocialPostStatus.SCHEDULED,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'social_post.target_retried',
      entityType: 'SocialPostTarget',
      entityId: target.id,
    });

    return toSocialPostResponseDto(
      await this.getEntityOrThrow(businessId, target.socialPostId),
    );
  }

  async calendar(
    businessId: string,
    query: CalendarQueryDto,
  ): Promise<SocialPostResponseDto[]> {
    const items = await this.socialPostRepository.calendar(
      businessId,
      new Date(query.from),
      new Date(query.to),
    );
    return items.map(toSocialPostResponseDto);
  }

  getPlatformSchemas(): PlatformSchemaDefinition[] {
    return getAllPlatformSchemas();
  }

  async rollupParentStatus(socialPostId: string): Promise<void> {
    await this.socialPostRepository.rollupParentStatus(socialPostId);
  }

  private async scheduleOrPublish(
    businessId: string,
    id: string,
    actor: RequestUser,
    options: { scheduledAt: Date; timezone?: string },
  ): Promise<SocialPostResponseDto> {
    const existing = await this.getEntityOrThrow(businessId, id);
    this.assertEditable(existing);

    if (existing.targets.length === 0) {
      throw new AppException(
        ErrorCode.SOCIAL_POST_VALIDATION_FAILED,
        'Social post has no targets to publish',
        HttpStatus.BAD_REQUEST,
      );
    }

    const validation = this.validateEntityTargets(existing);
    if (!validation.ok) {
      const errors: Record<string, string[]> = {};
      for (const target of validation.targets) {
        if (!target.valid) {
          errors[target.providerKey] = target.issues.map((i) => i.message);
        }
      }
      throw new AppException(
        ErrorCode.SOCIAL_POST_VALIDATION_FAILED,
        'One or more targets failed platform validation',
        HttpStatus.BAD_REQUEST,
        errors,
      );
    }

    const delay = Math.max(0, options.scheduledAt.getTime() - Date.now());

    for (const target of existing.targets) {
      await this.socialPostRepository.updateTarget(target.id, {
        status: SocialPostTargetStatus.SCHEDULED,
        scheduledAt: options.scheduledAt,
        errorCode: null,
        errorMessage: null,
      });

      const bullJobId = await this.queueService.enqueueSocialPublish(
        { businessId, socialPostTargetId: target.id },
        { delay, jobId: socialPublishJobId(target.id) },
      );
      if (bullJobId) {
        await this.socialPostRepository.updateTarget(target.id, {
          bullJobId,
        });
      }
    }

    await this.socialPostRepository.update(businessId, id, {
      status: SocialPostStatus.SCHEDULED,
      scheduledAt: options.scheduledAt,
      timezone: options.timezone,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action:
        delay === 0 ? 'social_post.published_now' : 'social_post.scheduled',
      entityType: 'SocialPost',
      entityId: id,
      metadata: { scheduledAt: options.scheduledAt.toISOString() },
    });

    return toSocialPostResponseDto(await this.getEntityOrThrow(businessId, id));
  }

  private validateEntityTargets(
    post: SocialPostWithRelations,
  ): ComposeValidationResult {
    const results: ComposeValidationTargetResult[] = post.targets.map(
      (target) => {
        const schema = getPlatformSchema(target.providerKey);
        const adapter = this.adapterRegistry.getAdapter(target.providerKey);
        if (!schema || !adapter) {
          return {
            providerKey: target.providerKey,
            valid: false,
            issues: [
              { message: `Unsupported provider: ${target.providerKey}` },
            ],
          };
        }

        const media = (target.media.length > 0 ? target.media : post.media).map(
          (m) => ({
            url: '',
            mimeType: m.fileAsset.mimeType,
            fileAssetId: m.fileAssetId,
          }),
        );

        const input: SocialPublishInput = {
          businessId: post.businessId,
          providerKey: target.providerKey,
          postType: target.postType,
          caption: post.caption,
          platformPayload: (target.platformPayload as Record<string, unknown>) ?? {},
          media,
          accessToken: '',
          externalResourceId: target.resource?.externalId ?? '',
          metadata: {},
        };

        const result = adapter.validate(input);
        return {
          providerKey: target.providerKey,
          valid: result.valid,
          issues: result.issues,
        };
      },
    );

    return { ok: results.every((r) => r.valid), targets: results };
  }

  private buildValidationInput(
    businessId: string,
    dto: ComposeLikeDto,
    target: ComposeLikeDto['targets'][number],
    schema: PlatformSchemaDefinition,
    media: SocialPublishInput['media'],
  ): SocialPublishInput {
    return {
      businessId,
      providerKey: target.providerKey,
      postType: target.postType ?? schema.postTypes[0]?.key ?? 'FEED',
      caption: dto.caption,
      platformPayload: target.platformPayload ?? {},
      media,
      accessToken: '',
      externalResourceId: '',
      metadata: {},
    };
  }

  private assertTargetsSupported(providerKeys: string[]): void {
    for (const key of providerKeys) {
      if (!isSupportedPlatformProviderKey(key)) {
        throw new AppException(
          ErrorCode.SOCIAL_PLATFORM_NOT_SUPPORTED,
          `Unsupported social platform: ${key}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private assertEditable(post: SocialPostWithRelations): void {
    if (
      post.status === SocialPostStatus.PUBLISHED ||
      post.status === SocialPostStatus.PUBLISHING
    ) {
      throw new AppException(
        ErrorCode.SOCIAL_POST_INVALID_STATE,
        `Cannot modify a post with status ${post.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getEntityOrThrow(
    businessId: string,
    id: string,
  ): Promise<SocialPostWithRelations> {
    const post = await this.socialPostRepository.findById(businessId, id);
    if (!post) {
      throw new AppException(
        ErrorCode.SOCIAL_POST_NOT_FOUND,
        'Social post not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return post;
  }
}
