export const TIKTOK_PUBLISH_INIT_URL =
  'https://open.tiktokapis.com/v2/post/publish/video/init/';
export const TIKTOK_INBOX_INIT_URL =
  'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';
export const TIKTOK_PUBLISH_STATUS_URL =
  'https://open.tiktokapis.com/v2/post/publish/status/fetch/';
export const TIKTOK_CREATOR_INFO_URL =
  'https://open.tiktokapis.com/v2/post/publish/creator_info/query/';
export const TIKTOK_OAUTH_TOKEN_URL =
  'https://open.tiktokapis.com/v2/oauth/token/';
export const TIKTOK_USER_INFO_URL =
  'https://open.tiktokapis.com/v2/user/info/';

/** Stored on target.platformPayload while TikTok is still processing. */
export const TIKTOK_PUBLISH_ID_PAYLOAD_KEY = '_tiktokPublishId';

export type TikTokPrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'SELF_ONLY';

export interface TikTokApiErrorBody {
  code?: string;
  message?: string;
  log_id?: string;
}

export interface TikTokInitData {
  publish_id?: string;
  upload_url?: string;
}

export interface TikTokStatusData {
  status?: string;
  fail_reason?: string;
  publicaly_available_post_id?: string[];
  publicly_available_post_id?: string[];
}

export interface TikTokCreatorInfoData {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
}

export class TikTokApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly logId?: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'TikTokApiError';
  }
}

export function isTikTokPullUrlError(error: unknown): boolean {
  if (!(error instanceof TikTokApiError)) return false;
  const code = error.code.toLowerCase();
  return (
    code.includes('url_ownership') ||
    code.includes('url_ownership_unverified') ||
    code.includes('invalid_file_url') ||
    code.includes('url_not_accessible') ||
    code.includes('pull')
  );
}

/** Direct Post blocked until audit / TikTok account is Private. */
export function isUnauditedPrivateAccountError(error: unknown): boolean {
  if (!(error instanceof TikTokApiError)) return false;
  const code = error.code.toLowerCase();
  return (
    code === 'unaudited_client_can_only_post_to_private_accounts' ||
    error.message.toLowerCase().includes('content-sharing-guidelines')
  );
}
