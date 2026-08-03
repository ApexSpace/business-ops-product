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
        },
        {
          key: 'privacyStatus',
          label: 'Privacy',
          type: 'select',
          required: false,
          defaultValue: 'public',
          options: [
            { value: 'public', label: 'Public' },
            { value: 'unlisted', label: 'Unlisted' },
            { value: 'private', label: 'Private' },
          ],
        },
        {
          key: 'categoryId',
          label: 'Category ID',
          type: 'text',
          required: false,
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
            { value: 'SELF_ONLY', label: 'Only me' },
          ],
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
        },
        {
          key: 'boardId',
          label: 'Board ID',
          type: 'text',
          required: false,
          helpText: 'Defaults to the selected Pinterest board resource.',
        },
        {
          key: 'link',
          label: 'Destination link',
          type: 'text',
          required: false,
        },
      ],
      mediaRules: {
        minCount: 1,
        maxCount: 1,
        allowImage: true,
        allowVideo: false,
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
