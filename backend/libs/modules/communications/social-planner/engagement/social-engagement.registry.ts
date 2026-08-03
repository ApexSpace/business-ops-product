import { Injectable } from '@nestjs/common';
import type { SocialEngagementAdapter } from './social-engagement-adapter.interface';
import { FacebookEngagementAdapter } from './facebook-engagement.adapter';
import { InstagramEngagementAdapter } from './instagram-engagement.adapter';
import { YouTubeEngagementAdapter } from './youtube-engagement.adapter';

@Injectable()
export class SocialEngagementAdapterRegistry {
  private readonly adapters: Map<string, SocialEngagementAdapter>;

  constructor(
    facebook: FacebookEngagementAdapter,
    instagram: InstagramEngagementAdapter,
    youtube: YouTubeEngagementAdapter,
  ) {
    this.adapters = new Map(
      [facebook, instagram, youtube].map((adapter) => [
        adapter.providerKey,
        adapter,
      ]),
    );
  }

  getAdapter(providerKey: string): SocialEngagementAdapter | null {
    return this.adapters.get(providerKey) ?? null;
  }

  hasAdapter(providerKey: string): boolean {
    return this.adapters.has(providerKey);
  }

  listProviderKeys(): string[] {
    return [...this.adapters.keys()];
  }
}
