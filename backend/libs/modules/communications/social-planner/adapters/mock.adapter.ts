import { Injectable } from '@nestjs/common';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';

/**
 * No-op adapter used in CI/tests and local development without real
 * provider credentials. Never makes network calls.
 */
@Injectable()
export class MockSocialPublishAdapter implements SocialPublishAdapter {
  readonly providerKey = 'mock';

  validate(): SocialPublishValidationResult {
    return { valid: true, issues: [] };
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    return {
      externalPostId: `mock-${Date.now()}`,
      permalink: `https://example.test/mock-post/${input.externalResourceId}`,
      raw: { mock: true },
    };
  }
}
