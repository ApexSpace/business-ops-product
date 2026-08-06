export type PlatformFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'boolean'
  | 'number';

export interface PlatformFieldOption {
  value: string;
  label: string;
}

export interface PlatformFieldDefinition {
  key: string;
  label: string;
  type: PlatformFieldType;
  required?: boolean;
  options?: PlatformFieldOption[];
  helpText?: string;
  defaultValue?: string | number | boolean;
}

export interface PlatformPostTypeDefinition {
  key: string;
  label: string;
}

export interface PlatformMediaRules {
  minCount: number;
  maxCount: number;
  allowImage: boolean;
  allowVideo: boolean;
  maxDurationSec?: number;
}

export interface PlatformSchemaDefinition {
  providerKey: string;
  displayName: string;
  captionMaxLength: number;
  postTypes: PlatformPostTypeDefinition[];
  fields: PlatformFieldDefinition[];
  mediaRules: PlatformMediaRules;
}

export const PLATFORM_SCHEMA_REGISTRY: Record<string, PlatformSchemaDefinition> =
  {
    facebook: {
      providerKey: 'facebook',
      displayName: 'Facebook',
      captionMaxLength: 63206,
      postTypes: [
        { key: 'FEED', label: 'Feed post' },
        { key: 'REEL', label: 'Reel' },
      ],
      fields: [],
      mediaRules: {
        minCount: 0,
        maxCount: 10,
        allowImage: true,
        allowVideo: true,
        maxDurationSec: 14400,
      },
    },
    instagram: {
      providerKey: 'instagram',
      displayName: 'Instagram',
      captionMaxLength: 2200,
      postTypes: [
        { key: 'FEED', label: 'Feed post' },
        { key: 'REEL', label: 'Reel' },
        { key: 'STORY', label: 'Story' },
        { key: 'CAROUSEL', label: 'Carousel' },
      ],
      fields: [],
      mediaRules: {
        minCount: 1,
        maxCount: 10,
        allowImage: true,
        allowVideo: true,
        maxDurationSec: 900,
      },
    },
    linkedin: {
      providerKey: 'linkedin',
      displayName: 'LinkedIn',
      captionMaxLength: 3000,
      postTypes: [{ key: 'FEED', label: 'Feed post' }],
      fields: [
        {
          key: 'visibility',
          label: 'Visibility',
          type: 'select',
          required: false,
          defaultValue: 'PUBLIC',
          options: [
            { value: 'PUBLIC', label: 'Anyone (public)' },
            { value: 'CONNECTIONS', label: 'Connections only' },
          ],
        },
      ],
      mediaRules: {
        minCount: 0,
        maxCount: 9,
        allowImage: true,
        allowVideo: true,
        maxDurationSec: 600,
      },
    },
    x: {
      providerKey: 'x',
      displayName: 'X (Twitter)',
      captionMaxLength: 280,
      postTypes: [{ key: 'TWEET', label: 'Tweet' }],
      fields: [],
      mediaRules: {
        minCount: 0,
        maxCount: 4,
        allowImage: true,
        allowVideo: true,
        maxDurationSec: 140,
      },
    },
    youtube: {
      providerKey: 'youtube',
      displayName: 'YouTube',
      captionMaxLength: 5000,
      postTypes: [
        { key: 'VIDEO', label: 'Video' },
        { key: 'SHORT', label: 'Short' },
      ],
      fields: [
        {
          key: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          helpText: 'Max 100 characters.',
        },
        {
          key: 'privacyStatus',
          label: 'Privacy',
          type: 'select',
          required: true,
          defaultValue: 'public',
          options: [
            { value: 'public', label: 'Public' },
            { value: 'unlisted', label: 'Unlisted' },
            { value: 'private', label: 'Private' },
          ],
        },
        {
          key: 'madeForKids',
          label: 'Made for kids',
          type: 'boolean',
          required: true,
          defaultValue: false,
          helpText:
            'Required by YouTube. Set yes only if the video is directed to children.',
        },
        {
          key: 'categoryId',
          label: 'Category',
          type: 'select',
          required: false,
          defaultValue: '22',
          options: [
            { value: '1', label: 'Film & Animation' },
            { value: '2', label: 'Autos & Vehicles' },
            { value: '10', label: 'Music' },
            { value: '15', label: 'Pets & Animals' },
            { value: '17', label: 'Sports' },
            { value: '19', label: 'Travel & Events' },
            { value: '20', label: 'Gaming' },
            { value: '22', label: 'People & Blogs' },
            { value: '23', label: 'Comedy' },
            { value: '24', label: 'Entertainment' },
            { value: '25', label: 'News & Politics' },
            { value: '26', label: 'Howto & Style' },
            { value: '27', label: 'Education' },
            { value: '28', label: 'Science & Technology' },
          ],
        },
        {
          key: 'tags',
          label: 'Tags',
          type: 'text',
          required: false,
          helpText: 'Comma-separated tags (optional).',
        },
      ],
      mediaRules: {
        minCount: 1,
        maxCount: 1,
        allowImage: false,
        allowVideo: true,
        maxDurationSec: 43200,
      },
    },
    tiktok: {
      providerKey: 'tiktok',
      displayName: 'TikTok',
      captionMaxLength: 2200,
      postTypes: [{ key: 'VIDEO', label: 'Video' }],
      fields: [
        {
          key: 'privacyLevel',
          label: 'Privacy level',
          type: 'select',
          required: true,
          options: [
            { value: 'PUBLIC_TO_EVERYONE', label: 'Everyone' },
            { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends' },
            { value: 'FOLLOWER_OF_CREATOR', label: 'Followers' },
            { value: 'SELF_ONLY', label: 'Only me' },
          ],
          helpText:
            'Must be selected manually; options depend on the connected account.',
        },
        {
          key: 'commercialDisclosure',
          label: 'Disclose commercial content',
          type: 'boolean',
          required: false,
          defaultValue: false,
          helpText:
            'Turn on if this content promotes yourself, a brand, product, or service.',
        },
        {
          key: 'brandOrganic',
          label: 'Your brand',
          type: 'boolean',
          required: false,
          defaultValue: false,
          helpText: 'You are promoting yourself or your own business.',
        },
        {
          key: 'brandedContent',
          label: 'Branded content',
          type: 'boolean',
          required: false,
          defaultValue: false,
          helpText:
            'You are promoting another brand or third party (Paid partnership). Cannot be Only me.',
        },
        {
          key: 'disableComment',
          label: 'Disable comments',
          type: 'boolean',
          required: false,
          defaultValue: false,
        },
        {
          key: 'disableDuet',
          label: 'Disable duet',
          type: 'boolean',
          required: false,
          defaultValue: false,
        },
        {
          key: 'disableStitch',
          label: 'Disable stitch',
          type: 'boolean',
          required: false,
          defaultValue: false,
        },
      ],
      mediaRules: {
        minCount: 1,
        maxCount: 1,
        allowImage: false,
        allowVideo: true,
        maxDurationSec: 600,
      },
    },
    'google-business-profile': {
      providerKey: 'google-business-profile',
      displayName: 'Google Business Profile',
      captionMaxLength: 1500,
      postTypes: [
        { key: 'STANDARD', label: 'Update' },
        { key: 'EVENT', label: 'Event' },
        { key: 'OFFER', label: 'Offer' },
      ],
      fields: [
        {
          key: 'ctaType',
          label: 'Call to action',
          type: 'select',
          required: false,
          options: [
            { value: 'LEARN_MORE', label: 'Learn more' },
            { value: 'BOOK', label: 'Book' },
            { value: 'ORDER', label: 'Order online' },
            { value: 'SHOP', label: 'Shop' },
            { value: 'SIGN_UP', label: 'Sign up' },
            { value: 'CALL', label: 'Call now' },
          ],
        },
        {
          key: 'ctaUrl',
          label: 'Call to action URL',
          type: 'text',
          required: false,
        },
      ],
      mediaRules: {
        minCount: 0,
        maxCount: 1,
        allowImage: true,
        allowVideo: false,
      },
    },
    pinterest: {
      providerKey: 'pinterest',
      displayName: 'Pinterest',
      captionMaxLength: 500,
      postTypes: [{ key: 'PIN', label: 'Pin' }],
      fields: [
        {
          key: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          helpText: 'Shown as the pin title on Pinterest (max 100 characters).',
        },
        {
          key: 'link',
          label: 'Destination link',
          type: 'text',
          required: false,
          helpText: 'Optional clickthrough URL for the pin.',
        },
        {
          key: 'altText',
          label: 'Alt text',
          type: 'text',
          required: false,
          helpText: 'Optional accessibility description for the pin media.',
        },
      ],
      mediaRules: {
        minCount: 1,
        maxCount: 1,
        allowImage: true,
        allowVideo: true,
        maxDurationSec: 300,
      },
    },
  };

export function getPlatformSchema(
  providerKey: string,
): PlatformSchemaDefinition | null {
  return PLATFORM_SCHEMA_REGISTRY[providerKey] ?? null;
}

export function getAllPlatformSchemas(): PlatformSchemaDefinition[] {
  return Object.values(PLATFORM_SCHEMA_REGISTRY);
}

export function isSupportedPlatformProviderKey(
  providerKey: string,
): boolean {
  return providerKey in PLATFORM_SCHEMA_REGISTRY;
}

export function getSupportedPlatformProviderKeys(): string[] {
  return Object.keys(PLATFORM_SCHEMA_REGISTRY);
}
