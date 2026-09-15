import { Injectable } from '@nestjs/common';
import { validateAgainstPlatformSchema } from '../utils/social-publish-validation.util';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

interface RegisterUploadResponse {
  value?: {
    uploadMechanism?: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'?: {
        uploadUrl?: string;
      };
    };
    asset?: string;
  };
}

@Injectable()
export class LinkedInPublishAdapter implements SocialPublishAdapter {
  readonly providerKey = 'linkedin';

  validate(input: SocialPublishInput): SocialPublishValidationResult {
    return validateAgainstPlatformSchema(input);
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const authorUrn = `urn:li:organization:${input.externalResourceId}`;
    const visibility =
      (input.platformPayload.visibility as string | undefined) ?? 'PUBLIC';

    const assetUrns = await this.registerAndUploadMedia(input);
    const isVideo = input.media.some((m) =>
      m.mimeType.toLowerCase().startsWith('video/'),
    );

    const body = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: input.caption },
          shareMediaCategory:
            assetUrns.length === 0 ? 'NONE' : isVideo ? 'VIDEO' : 'IMAGE',
          media: assetUrns.map((asset) => ({
            status: 'READY',
            media: asset,
          })),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility,
      },
    };

    const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`LinkedIn publish failed: ${detail}`);
    }

    const postId =
      response.headers.get('x-restli-id') ??
      ((await response.json().catch(() => null)) as { id?: string } | null)
        ?.id;

    if (!postId) {
      throw new Error('LinkedIn publish did not return a post id');
    }

    return {
      externalPostId: postId,
      permalink: `https://www.linkedin.com/feed/update/${postId}`,
    };
  }

  private async registerAndUploadMedia(
    input: SocialPublishInput,
  ): Promise<string[]> {
    const assetUrns: string[] = [];
    for (const media of input.media) {
      const isVideo = media.mimeType.toLowerCase().startsWith('video/');
      const recipe = isVideo
        ? 'urn:li:digitalmediaRecipe:feedshare-video'
        : 'urn:li:digitalmediaRecipe:feedshare-image';

      const registerResponse = await fetch(
        `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: [recipe],
              owner: `urn:li:organization:${input.externalResourceId}`,
              serviceRelationships: [
                {
                  relationshipType: 'OWNER',
                  identifier: 'urn:li:userGeneratedContent',
                },
              ],
            },
          }),
        },
      );

      if (!registerResponse.ok) {
        const detail = await registerResponse.text();
        throw new Error(`LinkedIn media registration failed: ${detail}`);
      }

      const registerData =
        (await registerResponse.json()) as RegisterUploadResponse;
      const uploadUrl =
        registerData.value?.uploadMechanism?.[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ]?.uploadUrl;
      const asset = registerData.value?.asset;

      if (!uploadUrl || !asset) {
        throw new Error('LinkedIn media registration missing upload target');
      }

      const mediaBytes = await fetch(media.url).then((res) => res.arrayBuffer());
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          'Content-Type': media.mimeType,
        },
        body: new Uint8Array(mediaBytes),
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `LinkedIn media upload failed (${uploadResponse.status})`,
        );
      }

      assetUrns.push(asset);
    }
    return assetUrns;
  }
}
