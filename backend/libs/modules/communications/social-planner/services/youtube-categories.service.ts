import { Injectable, Logger } from '@nestjs/common';
import { youtubeListCategories } from '../adapters/youtube/youtube-api.client';
import { YOUTUBE_FALLBACK_CATEGORIES } from '../adapters/youtube/youtube.constants';
import { SocialTokenResolverService } from './social-token-resolver.service';

export interface YouTubeCategoryDto {
  id: string;
  title: string;
}

@Injectable()
export class YouTubeCategoriesService {
  private readonly logger = new Logger(YouTubeCategoriesService.name);
  private cache: { expiresAt: number; value: YouTubeCategoryDto[] } | null =
    null;

  constructor(private readonly tokenResolver: SocialTokenResolverService) {}

  async listCategories(businessId: string): Promise<YouTubeCategoryDto[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.value;
    }

    try {
      const accessToken = await this.tokenResolver.getAccessToken(
        businessId,
        'youtube',
      );
      const categories = await youtubeListCategories({ accessToken });
      this.cache = {
        value: categories,
        expiresAt: Date.now() + 6 * 60 * 60 * 1000,
      };
      return categories;
    } catch (error) {
      this.logger.warn(
        `YouTube categories fetch failed for business=${businessId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (this.cache?.value?.length) {
        return this.cache.value;
      }
      return YOUTUBE_FALLBACK_CATEGORIES.map((c) => ({
        id: c.id,
        title: c.title,
      }));
    }
  }
}
