import { Injectable } from '@nestjs/common';
import type { SocialPublishAdapter } from './social-publish-adapter.interface';
import { FacebookPublishAdapter } from './facebook.adapter';
import { GoogleBusinessProfilePublishAdapter } from './gbp.adapter';
import { InstagramPublishAdapter } from './instagram.adapter';
import { LinkedInPublishAdapter } from './linkedin.adapter';
import { MockSocialPublishAdapter } from './mock.adapter';
import { PinterestPublishAdapter } from './pinterest.adapter';
import { TikTokPublishAdapter } from './tiktok.adapter';
import { XPublishAdapter } from './x.adapter';
import { YouTubePublishAdapter } from './youtube.adapter';

@Injectable()
export class SocialPublishAdapterRegistry {
  private readonly adapters: Map<string, SocialPublishAdapter>;

  constructor(
    facebookAdapter: FacebookPublishAdapter,
    instagramAdapter: InstagramPublishAdapter,
    gbpAdapter: GoogleBusinessProfilePublishAdapter,
    linkedinAdapter: LinkedInPublishAdapter,
    youtubeAdapter: YouTubePublishAdapter,
    xAdapter: XPublishAdapter,
    pinterestAdapter: PinterestPublishAdapter,
    tiktokAdapter: TikTokPublishAdapter,
    mockAdapter: MockSocialPublishAdapter,
  ) {
    this.adapters = new Map(
      [
        facebookAdapter,
        instagramAdapter,
        gbpAdapter,
        linkedinAdapter,
        youtubeAdapter,
        xAdapter,
        pinterestAdapter,
        tiktokAdapter,
        mockAdapter,
      ].map((adapter) => [adapter.providerKey, adapter]),
    );
  }

  getAdapter(providerKey: string): SocialPublishAdapter | null {
    return this.adapters.get(providerKey) ?? null;
  }

  hasAdapter(providerKey: string): boolean {
    return this.adapters.has(providerKey);
  }
}
