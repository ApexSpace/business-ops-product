import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { IntegrationResourceType } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import { tiktokQueryCreatorInfo } from '../adapters/tiktok/tiktok-api.client';
import { TikTokCreatorInfoResponseDto } from '../dto/tiktok-creator-info-response.dto';
import { SocialTokenResolverService } from './social-token-resolver.service';

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  value: TikTokCreatorInfoResponseDto;
};

@Injectable()
export class TikTokCreatorInfoService {
  private readonly logger = new Logger(TikTokCreatorInfoService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly tokenResolver: SocialTokenResolverService,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
  ) {}

  async getCreatorInfo(
    businessId: string,
    resourceId: string,
  ): Promise<TikTokCreatorInfoResponseDto> {
    const cacheKey = `${businessId}:${resourceId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const resource =
      await this.integrationResourceRepository.findByIdAndBusiness(
        resourceId,
        businessId,
      );
    if (!resource || resource.providerKey !== 'tiktok') {
      throw new AppException(
        ErrorCode.INTEGRATION_RESOURCE_NOT_FOUND,
        'TikTok integration resource not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (resource.type !== IntegrationResourceType.TIKTOK_USER) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Resource is not a TikTok user',
        HttpStatus.BAD_REQUEST,
      );
    }

    const accessToken = await this.tokenResolver.getAccessToken(
      businessId,
      'tiktok',
      resourceId,
    );

    try {
      const data = await tiktokQueryCreatorInfo(accessToken);
      const dto: TikTokCreatorInfoResponseDto = {
        creatorAvatarUrl: data.creator_avatar_url ?? '',
        creatorUsername: data.creator_username ?? '',
        creatorNickname: data.creator_nickname ?? resource.name,
        privacyLevelOptions: data.privacy_level_options ?? ['SELF_ONLY'],
        commentDisabled: Boolean(data.comment_disabled),
        duetDisabled: Boolean(data.duet_disabled),
        stitchDisabled: Boolean(data.stitch_disabled),
        maxVideoPostDurationSec: data.max_video_post_duration_sec,
      };
      this.cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: dto,
      });
      return dto;
    } catch (error) {
      this.logger.warn(
        `creator_info failed business=${businessId} resource=${resourceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new AppException(
        ErrorCode.SOCIAL_PUBLISH_FAILED,
        error instanceof Error
          ? error.message
          : 'Failed to load TikTok creator info',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  invalidate(businessId: string, resourceId?: string): void {
    if (!resourceId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${businessId}:`)) this.cache.delete(key);
      }
      return;
    }
    this.cache.delete(`${businessId}:${resourceId}`);
  }
}
