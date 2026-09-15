import { Injectable, Logger } from '@nestjs/common';
import {
  META_INSTAGRAM_APP_WEBHOOK_FIELDS,
  META_MESSAGING_PAGE_WEBHOOK_FIELDS,
} from '../constants/meta-messaging-webhook.constants';
import { getMetaGraphBaseUrl } from '../constants/meta-oauth.constants';
import { MetaConfigService } from './meta-config.service';

export interface MetaUserProfile {
  id: string;
  name?: string;
  email?: string;
}

export interface MetaInstagramBusinessAccountRef {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
}

export interface MetaPageAccount {
  id: string;
  name: string;
  access_token?: string;
  category?: string;
  picture?: { data?: { url?: string } };
  tasks?: string[];
  instagram_business_account?: MetaInstagramBusinessAccountRef;
}

export interface MetaInstagramAccount {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  linkedPageId: string;
  linkedPageName: string;
  pageAccessToken?: string;
}

export interface MetaWhatsAppPhone {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  messaging_limit_tier?: string;
}

export interface MetaWhatsAppBusinessAccount {
  id: string;
  name?: string;
  phoneNumbers: MetaWhatsAppPhone[];
}

interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

interface MetaGraphListResponse<T> {
  data?: T[];
  paging?: { next?: string };
}

interface MetaWabaResponse {
  data?: Array<{ id: string; name?: string }>;
}

interface MetaPhoneNumbersResponse {
  data?: MetaWhatsAppPhone[];
}

export interface MetaMessageTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: unknown[];
  rejected_reason?: string;
  quality_score?: unknown;
  parameter_format?: string;
}

interface MetaMessageTemplateListResponse {
  data?: MetaMessageTemplate[];
  paging?: { next?: string };
}

interface MetaResumableUploadSessionResponse {
  id: string;
}

interface MetaResumableUploadResponse {
  h: string;
}

/** Nested field expansion for /me/accounts — required for instagram_business_account data. */
const PAGE_LIST_FIELDS =
  'id,name,access_token,category,picture,tasks,instagram_business_account{id,username,name,profile_picture_url}';

/**
 * Page node lookup (GET /{page-id}) — `tasks` is only valid on /me/accounts edges,
 * not on the Page node itself (Meta returns (#100) nonexisting field).
 */
const PAGE_BY_ID_FIELDS =
  'id,name,access_token,category,picture,instagram_business_account{id,username,name,profile_picture_url}';

const INSTAGRAM_ACCOUNT_FIELDS = 'id,username,name,profile_picture_url';

@Injectable()
export class MetaApiClient {
  private readonly logger = new Logger(MetaApiClient.name);

  constructor(private readonly metaConfigService: MetaConfigService) {}

  async exchangeCodeForToken(
    code: string,
    providerKey?: string,
    options?: { includeRedirectUri?: boolean },
  ): Promise<MetaTokenResponse> {
    const { appId, appSecret } = this.metaConfigService.getMetaAppConfig();
    const includeRedirectUri = options?.includeRedirectUri ?? true;

    const url = new URL(`${getMetaGraphBaseUrl()}/oauth/access_token`);
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    if (includeRedirectUri) {
      url.searchParams.set(
        'redirect_uri',
        this.metaConfigService.getMetaRedirectUri(providerKey),
      );
    }
    url.searchParams.set('code', code);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Meta token exchange failed: ${detail}`);
    }

    return (await response.json()) as MetaTokenResponse;
  }

  async exchangeForLongLivedToken(
    shortLivedToken: string,
  ): Promise<MetaTokenResponse> {
    const { appId, appSecret } = this.metaConfigService.getMetaAppConfig();
    const url = new URL(`${getMetaGraphBaseUrl()}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('fb_exchange_token', shortLivedToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Meta long-lived token exchange failed: ${detail}`);
    }

    return (await response.json()) as MetaTokenResponse;
  }

  async getUserProfile(accessToken: string): Promise<MetaUserProfile> {
    const url = new URL(`${getMetaGraphBaseUrl()}/me`);
    url.searchParams.set('fields', 'id,name,email');
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch Meta user profile');
    }

    return (await response.json()) as MetaUserProfile;
  }

  /**
   * Business Login for Instagram — exchange authorization code for short-lived token.
   * POST https://api.instagram.com/oauth/access_token
   */
  async exchangeInstagramLoginCodeForToken(
    code: string,
  ): Promise<MetaTokenResponse & { user_id?: number | string }> {
    const { appId, appSecret } =
      this.metaConfigService.getInstagramLoginAppCredentials();
    const redirectUri = this.metaConfigService.getMetaRedirectUri(
      'instagram',
      'INSTAGRAM_LOGIN',
    );

    const body = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`Instagram Login token exchange failed: ${detail}`);
    }

    const data = (await response.json()) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      user_id?: number | string;
      // Some responses wrap in data array
      data?: Array<{
        access_token?: string;
        user_id?: number | string;
        permissions?: string;
      }>;
    };

    const token =
      data.access_token ??
      data.data?.[0]?.access_token;
    if (!token) {
      throw new Error('Instagram Login token exchange returned no access_token');
    }

    return {
      access_token: token,
      token_type: data.token_type ?? 'bearer',
      expires_in: data.expires_in,
      user_id: data.user_id ?? data.data?.[0]?.user_id,
    };
  }

  /** Exchange short-lived Instagram User token for long-lived (60 days). */
  async exchangeInstagramLoginForLongLivedToken(
    shortLivedToken: string,
  ): Promise<MetaTokenResponse> {
    const { appSecret } =
      this.metaConfigService.getInstagramLoginAppCredentials();
    const url = new URL('https://graph.instagram.com/access_token');
    url.searchParams.set('grant_type', 'ig_exchange_token');
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('access_token', shortLivedToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(
        `Instagram Login long-lived token exchange failed: ${detail}`,
      );
    }

    return (await response.json()) as MetaTokenResponse;
  }

  async getInstagramLoginProfile(accessToken: string): Promise<{
    id: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
  }> {
    const url = new URL('https://graph.instagram.com/me');
    url.searchParams.set(
      'fields',
      'user_id,username,name,account_type,profile_picture_url',
    );
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`Failed to fetch Instagram Login profile: ${detail}`);
    }

    const data = (await response.json()) as {
      user_id?: string | number;
      id?: string | number;
      username?: string;
      name?: string;
      profile_picture_url?: string;
    };

    const id = String(data.user_id ?? data.id ?? '');
    if (!id) {
      throw new Error('Instagram Login profile missing user id');
    }

    return {
      id,
      username: data.username,
      name: data.name,
      profile_picture_url: data.profile_picture_url,
    };
  }

  /**
   * Send an Instagram DM via Instagram API with Instagram Login
   * (graph.instagram.com / {ig-user-id}/messages).
   */
  async sendInstagramLoginMessage(
    igUserId: string,
    igUserAccessToken: string,
    recipientIgsid: string,
    text: string,
    attachments?: Array<{ type: string; url: string }>,
  ): Promise<{ messageId: string }> {
    const payloads = this.buildOutboundMessagePayloads(text, attachments);
    if (payloads.length === 0) {
      throw new Error(
        'Instagram send message failed: message text or attachment is required',
      );
    }

    const version = process.env.META_GRAPH_API_VERSION?.trim() || 'v20.0';
    let lastMessageId = '';

    for (const message of payloads) {
      const endpoint = new URL(
        `https://graph.instagram.com/${version}/${igUserId}/messages`,
      );
      endpoint.searchParams.set('access_token', igUserAccessToken);

      const response = await fetch(endpoint.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientIgsid },
          message,
        }),
      });

      if (!response.ok) {
        const detail = this.sanitizeGraphError(await response.text());
        throw new Error(`Instagram Login send message failed: ${detail}`);
      }

      const data = (await response.json()) as {
        message_id?: string;
      };
      lastMessageId = data.message_id ?? lastMessageId;
    }

    return { messageId: lastMessageId };
  }

  /**
   * Lists Facebook Pages the user authorized (user access token).
   * Paginates and requests instagram_business_account with nested fields.
   *
   * When /me/accounts returns [] (common for Business-linked Pages without
   * business_management), falls back to page IDs from debug_token granular_scopes.
   */
  async listPages(accessToken: string): Promise<MetaPageAccount[]> {
    const pages: MetaPageAccount[] = [];
    let nextUrl: string | null = this.buildGraphUrl('/me/accounts', {
      fields: PAGE_LIST_FIELDS,
      access_token: accessToken,
      limit: '100',
    });

    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Failed to list Facebook Pages (${response.status}): ${this.sanitizeGraphError(detail)}`,
        );
      }

      const data =
        (await response.json()) as MetaGraphListResponse<MetaPageAccount>;
      pages.push(...(data.data ?? []));
      nextUrl = data.paging?.next ?? null;
    }

    if (pages.length === 0) {
      const fromGranular =
        await this.listPagesFromGranularScopes(accessToken);
      if (fromGranular.length > 0) {
        this.logger.warn(
          `[Facebook Sync] /me/accounts empty; recovered ${fromGranular.length} Page(s) via debug_token granular_scopes`,
        );
        pages.push(...fromGranular);
      } else {
        this.logger.warn(
          `[Facebook Sync] /me/accounts empty and granular_scopes Page recovery returned 0 Pages`,
        );
      }
    }

    if (this.isInstagramSyncDebugEnabled()) {
      this.logger.log(`[Instagram Sync] pages count=${pages.length}`);
      for (const page of pages) {
        this.logger.log(
          `[Instagram Sync] page id=${page.id} hasInstagramBusinessAccount=${Boolean(page.instagram_business_account?.id)} hasPageAccessToken=${Boolean(page.access_token)}`,
        );
      }
    }

    return pages;
  }

  /**
   * When /me/accounts is empty, Meta often still exposes authorized Page IDs
   * on the user token via debug_token.granular_scopes.target_ids.
   */
  private async listPagesFromGranularScopes(
    accessToken: string,
  ): Promise<MetaPageAccount[]> {
    const pageIds = await this.getAuthorizedPageIdsFromDebugToken(accessToken);
    if (pageIds.length === 0) {
      return [];
    }

    const pages: MetaPageAccount[] = [];
    for (const pageId of pageIds) {
      const page = await this.fetchPageById(pageId, accessToken);
      if (page) {
        pages.push(page);
      }
    }
    return pages;
  }

  private async getAuthorizedPageIdsFromDebugToken(
    accessToken: string,
  ): Promise<string[]> {
    try {
      const { appId, appSecret } = this.metaConfigService.getMetaAppConfig();
      const appAccessToken = `${appId}|${appSecret}`;
      const url = this.buildGraphUrl('/debug_token', {
        input_token: accessToken,
        access_token: appAccessToken,
      });

      const response = await fetch(url);
      if (!response.ok) {
        const detail = this.sanitizeGraphError(await response.text());
        this.logger.warn(
          `[Facebook Sync] debug_token failed (${response.status}): ${detail}`,
        );
        return [];
      }

      const body = (await response.json()) as {
        data?: {
          scopes?: string[];
          granular_scopes?: Array<{
            scope?: string;
            target_ids?: string[];
          }>;
        };
      };

      const scopes = body.data?.scopes ?? [];
      if (this.isInstagramSyncDebugEnabled()) {
        this.logger.log(
          `[Facebook Sync] token scopes=${scopes.join(',') || '(none)'} granular=${JSON.stringify(body.data?.granular_scopes ?? [])}`,
        );
      }

      // Only pages_* target_ids are Page IDs. business_management targets are
      // Business Manager IDs and must not be fetched as Pages.
      const ids = new Set<string>();
      for (const entry of body.data?.granular_scopes ?? []) {
        const scope = entry.scope ?? '';
        if (!scope.startsWith('pages_')) {
          continue;
        }
        for (const id of entry.target_ids ?? []) {
          if (id) {
            ids.add(String(id));
          }
        }
      }
      return [...ids];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[Facebook Sync] debug_token granular lookup failed: ${message}`,
      );
      return [];
    }
  }

  private async fetchPageById(
    pageId: string,
    accessToken: string,
  ): Promise<MetaPageAccount | null> {
    const url = this.buildGraphUrl(`/${pageId}`, {
      fields: PAGE_BY_ID_FIELDS,
      access_token: accessToken,
    });

    const response = await fetch(url);
    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      this.logger.warn(
        `[Facebook Sync] fetch page id=${pageId} failed (${response.status}): ${detail}`,
      );
      return null;
    }

    const page = (await response.json()) as MetaPageAccount & {
      error?: unknown;
    };
    if (!page.id || !page.name) {
      return null;
    }
    return page;
  }

  /**
   * Discovers Instagram professional accounts linked to authorized Pages.
   * Uses user token for /me/accounts; prefers page access token for IG details.
   */
  async listInstagramAccounts(
    userAccessToken: string,
    pages: MetaPageAccount[],
  ): Promise<MetaInstagramAccount[]> {
    const accounts: MetaInstagramAccount[] = [];
    const seenIgIds = new Set<string>();

    for (const page of pages) {
      const igRef = await this.resolveInstagramBusinessAccountForPage(
        page,
        userAccessToken,
      );

      if (!igRef?.id) {
        if (this.isInstagramSyncDebugEnabled()) {
          this.logger.log(
            `[Instagram Sync] page id=${page.id} no linked instagram_business_account`,
          );
        }
        continue;
      }

      if (seenIgIds.has(igRef.id)) {
        continue;
      }
      seenIgIds.add(igRef.id);

      const pageToken = page.access_token;
      const igDetails =
        igRef.username || igRef.name
          ? igRef
          : await this.fetchInstagramAccountDetails(
              igRef.id,
              pageToken,
              userAccessToken,
            );

      if (!igDetails) {
        if (this.isInstagramSyncDebugEnabled()) {
          this.logger.warn(
            `[Instagram Sync] could not load ig account id=${igRef.id} for page id=${page.id}`,
          );
        }
        continue;
      }

      if (this.isInstagramSyncDebugEnabled()) {
        this.logger.log(
          `[Instagram Sync] ig account id=${igDetails.id} username=${igDetails.username ?? 'n/a'} pageId=${page.id}`,
        );
      }

      accounts.push({
        id: igDetails.id,
        username: igDetails.username,
        name: igDetails.name,
        profile_picture_url: igDetails.profile_picture_url,
        linkedPageId: page.id,
        linkedPageName: page.name,
        pageAccessToken: pageToken,
      });
    }

    if (this.isInstagramSyncDebugEnabled()) {
      this.logger.log(
        `[Instagram Sync] discovered instagram accounts count=${accounts.length}`,
      );
    }

    return accounts;
  }

  private async resolveInstagramBusinessAccountForPage(
    page: MetaPageAccount,
    userAccessToken: string,
  ): Promise<MetaInstagramBusinessAccountRef | null> {
    if (page.instagram_business_account?.id) {
      return page.instagram_business_account;
    }

    const pageToken = page.access_token ?? userAccessToken;
    const url = this.buildGraphUrl(`/${page.id}`, {
      fields: `instagram_business_account{${INSTAGRAM_ACCOUNT_FIELDS}}`,
      access_token: pageToken,
    });

    const response = await fetch(url);
    if (!response.ok) {
      if (this.isInstagramSyncDebugEnabled()) {
        this.logger.warn(
          `[Instagram Sync] page instagram_business_account lookup failed pageId=${page.id} status=${response.status}`,
        );
      }
      return null;
    }

    const data = (await response.json()) as {
      instagram_business_account?: MetaInstagramBusinessAccountRef;
    };

    return data.instagram_business_account ?? null;
  }

  private async fetchInstagramAccountDetails(
    igId: string,
    pageAccessToken: string | undefined,
    userAccessToken: string,
  ): Promise<MetaInstagramBusinessAccountRef | null> {
    const tokens = [
      ...new Set(
        [pageAccessToken, userAccessToken].filter((token): token is string =>
          Boolean(token),
        ),
      ),
    ];

    for (const token of tokens) {
      const url = this.buildGraphUrl(`/${igId}`, {
        fields: INSTAGRAM_ACCOUNT_FIELDS,
        access_token: token,
      });

      const response = await fetch(url);
      if (response.ok) {
        return (await response.json()) as MetaInstagramBusinessAccountRef;
      }

      if (this.isInstagramSyncDebugEnabled()) {
        this.logger.warn(
          `[Instagram Sync] ig details fetch failed igId=${igId} status=${response.status}`,
        );
      }
    }

    return null;
  }

  private buildGraphUrl(path: string, params: Record<string, string>): string {
    const url = new URL(`${getMetaGraphBaseUrl()}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private sanitizeGraphError(detail: string): string {
    return detail.replace(/access_token=[^&\s"]+/gi, 'access_token=[REDACTED]');
  }

  private isInstagramSyncDebugEnabled(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      (process.env.META_OAUTH_DEBUG ?? '').toLowerCase() === 'true'
    );
  }

  async listWhatsAppBusinessAccounts(
    accessToken: string,
  ): Promise<MetaWhatsAppBusinessAccount[]> {
    const url = new URL(`${getMetaGraphBaseUrl()}/me/businesses`);
    url.searchParams.set('fields', 'id,name');
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      return [];
    }

    const businesses = (await response.json()) as MetaWabaResponse;
    const result: MetaWhatsAppBusinessAccount[] = [];

    for (const business of businesses.data ?? []) {
      const wabaUrl = new URL(
        `${getMetaGraphBaseUrl()}/${business.id}/owned_whatsapp_business_accounts`,
      );
      wabaUrl.searchParams.set('fields', 'id,name');
      wabaUrl.searchParams.set('access_token', accessToken);

      const wabaRes = await fetch(wabaUrl.toString());
      if (!wabaRes.ok) continue;

      const wabas = (await wabaRes.json()) as MetaWabaResponse;
      for (const waba of wabas.data ?? []) {
        const phones = await this.listPhoneNumbersForWaba(waba.id, accessToken);
        result.push({
          id: waba.id,
          name: waba.name,
          phoneNumbers: phones,
        });
      }
    }

    return result;
  }

  async sendMessengerMessage(
    pageId: string,
    pageAccessToken: string,
    recipientPsid: string,
    text: string,
    attachments?: Array<{ type: string; url: string }>,
  ): Promise<{ messageId: string }> {
    return this.sendGraphMessages(
      pageId,
      pageAccessToken,
      recipientPsid,
      text,
      attachments,
      { messagingType: 'RESPONSE' },
      'Meta send message failed',
    );
  }

  /**
   * Send an Instagram DM via the Facebook Login / Messenger Platform integration.
   * Uses the linked Facebook Page ID (not the Instagram account ID) per Meta docs.
   */
  async sendInstagramMessage(
    linkedPageId: string,
    pageAccessToken: string,
    recipientIgsid: string,
    text: string,
    attachments?: Array<{ type: string; url: string }>,
  ): Promise<{ messageId: string }> {
    return this.sendGraphMessages(
      linkedPageId,
      pageAccessToken,
      recipientIgsid,
      text,
      attachments,
      { messagingType: 'RESPONSE' },
      'Instagram send message failed',
    );
  }

  async sendWhatsAppMessage(
    phoneNumberId: string,
    accessToken: string,
    recipientWaId: string,
    text: string,
    attachments?: Array<{ type: string; url: string }>,
  ): Promise<{ messageId: string }> {
    const payloads = this.buildWhatsAppOutboundPayloads(text, attachments);
    if (payloads.length === 0) {
      throw new Error(
        'WhatsApp send message failed: message text or attachment is required',
      );
    }

    let lastMessageId = '';
    for (const message of payloads) {
      const url = this.buildGraphUrl(`/${phoneNumberId}/messages`, {
        access_token: accessToken,
      });

      const body: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientWaId,
        ...message,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = this.sanitizeGraphError(await response.text());
        throw new Error(`WhatsApp send message failed: ${detail}`);
      }

      const data = (await response.json()) as {
        messages?: Array<{ id?: string }>;
      };
      lastMessageId = data.messages?.[0]?.id ?? lastMessageId;
    }

    return { messageId: lastMessageId };
  }

  private buildWhatsAppOutboundPayloads(
    text: string,
    attachments?: Array<{ type: string; url: string }>,
  ): Array<Record<string, unknown>> {
    const payloads: Array<Record<string, unknown>> = [];
    const trimmedText = text.trim();

    for (const attachment of attachments ?? []) {
      const type = attachment.type.trim();
      const url = attachment.url.trim();
      if (!url) continue;

      if (type === 'image') {
        payloads.push({ type: 'image', image: { link: url } });
      } else if (type === 'video') {
        payloads.push({ type: 'video', video: { link: url } });
      } else if (type === 'audio') {
        payloads.push({ type: 'audio', audio: { link: url } });
      } else if (type === 'file') {
        payloads.push({
          type: 'document',
          document: { link: url, filename: 'attachment' },
        });
      }
    }

    if (trimmedText) {
      payloads.push({ type: 'text', text: { body: trimmedText } });
    }

    return payloads;
  }

  private async sendGraphMessages(
    resourceId: string,
    accessToken: string,
    recipientId: string,
    text: string,
    attachments: Array<{ type: string; url: string }> | undefined,
    options: { messagingType?: string },
    errorPrefix: string,
  ): Promise<{ messageId: string }> {
    const payloads = this.buildOutboundMessagePayloads(text, attachments);
    if (payloads.length === 0) {
      throw new Error(`${errorPrefix}: message text or attachment is required`);
    }

    let lastMessageId = '';
    for (const message of payloads) {
      const url = this.buildGraphUrl(`/${resourceId}/messages`, {
        access_token: accessToken,
      });

      const body: Record<string, unknown> = {
        recipient: { id: recipientId },
        message,
      };
      if (options.messagingType) {
        body.messaging_type = options.messagingType;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = this.sanitizeGraphError(await response.text());
        throw new Error(`${errorPrefix}: ${detail}`);
      }

      const data = (await response.json()) as {
        message_id?: string;
        recipient_id?: string;
      };
      lastMessageId = data.message_id ?? lastMessageId;
    }

    return { messageId: lastMessageId };
  }

  private buildOutboundMessagePayloads(
    text: string,
    attachments?: Array<{ type: string; url: string }>,
  ): Array<Record<string, unknown>> {
    const payloads: Array<Record<string, unknown>> = [];
    const trimmedText = text.trim();

    for (const attachment of attachments ?? []) {
      const type = attachment.type.trim();
      const url = attachment.url.trim();
      if (!url) continue;
      payloads.push({
        attachment: {
          type,
          payload: { url, is_reusable: true },
        },
      });
    }

    if (trimmedText) {
      payloads.push({ text: trimmedText });
    }

    return payloads;
  }

  async getMessengerUserProfile(
    psid: string,
    pageAccessToken: string,
  ): Promise<{ name?: string; profilePic?: string; email?: string }> {
    const url = this.buildGraphUrl(`/${psid}`, {
      fields: 'first_name,last_name,name,profile_pic,email',
      access_token: pageAccessToken,
    });

    const response = await fetch(url);
    if (!response.ok) {
      return {};
    }

    const data = (await response.json()) as {
      name?: string;
      first_name?: string;
      last_name?: string;
      profile_pic?: string;
      email?: string;
    };

    const combinedName = [data.first_name, data.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    const name = data.name ?? (combinedName || undefined);
    const email = data.email?.trim().toLowerCase() || undefined;

    return { name, profilePic: data.profile_pic, email };
  }

  async getInstagramUserProfile(
    instagramScopedUserId: string,
    pageAccessToken: string,
  ): Promise<{ name?: string; profilePic?: string }> {
    const url = this.buildGraphUrl(`/${instagramScopedUserId}`, {
      fields: 'name,profile_pic',
      access_token: pageAccessToken,
    });

    const response = await fetch(url);
    if (!response.ok) {
      return {};
    }

    const data = (await response.json()) as {
      name?: string;
      profile_pic?: string;
    };

    return {
      name: data.name?.trim() || undefined,
      profilePic: data.profile_pic,
    };
  }

  async listPhoneNumbersForWaba(
    wabaId: string,
    accessToken: string,
  ): Promise<MetaWhatsAppPhone[]> {
    const url = new URL(`${getMetaGraphBaseUrl()}/${wabaId}/phone_numbers`);
    url.searchParams.set(
      'fields',
      'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier',
    );
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const data = (await response.json()) as MetaPhoneNumbersResponse;
    return data.data ?? [];
  }

  async listMessageTemplates(
    wabaId: string,
    accessToken: string,
    fields = 'id,name,language,status,category,components,rejected_reason,quality_score,parameter_format',
  ): Promise<MetaMessageTemplate[]> {
    const templates: MetaMessageTemplate[] = [];
    let nextUrl: string | null = this.buildGraphUrl(
      `/${wabaId}/message_templates`,
      {
        fields,
        limit: '100',
        access_token: accessToken,
      },
    );

    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        const detail = this.sanitizeGraphError(await response.text());
        throw new Error(`Meta list message templates failed: ${detail}`);
      }

      const data = (await response.json()) as MetaMessageTemplateListResponse;
      templates.push(...(data.data ?? []));
      nextUrl = data.paging?.next ?? null;
    }

    return templates;
  }

  async getMessageTemplate(
    metaTemplateId: string,
    accessToken: string,
    fields = 'id,name,language,status,category,components,rejected_reason,quality_score,parameter_format',
  ): Promise<MetaMessageTemplate> {
    const url = this.buildGraphUrl(`/${metaTemplateId}`, {
      fields,
      access_token: accessToken,
    });

    const response = await fetch(url);
    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`Meta get message template failed: ${detail}`);
    }

    return (await response.json()) as MetaMessageTemplate;
  }

  async createMessageTemplate(
    wabaId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaMessageTemplate> {
    const url = this.buildGraphUrl(`/${wabaId}/message_templates`, {
      access_token: accessToken,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`Meta create message template failed: ${detail}`);
    }

    return (await response.json()) as MetaMessageTemplate;
  }

  async updateMessageTemplate(
    metaTemplateId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MetaMessageTemplate> {
    const url = this.buildGraphUrl(`/${metaTemplateId}`, {
      access_token: accessToken,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`Meta update message template failed: ${detail}`);
    }

    return (await response.json()) as MetaMessageTemplate;
  }

  async deleteMessageTemplate(
    wabaId: string,
    accessToken: string,
    name: string,
  ): Promise<void> {
    const url = this.buildGraphUrl(`/${wabaId}/message_templates`, {
      name,
      access_token: accessToken,
    });

    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`Meta delete message template failed: ${detail}`);
    }
  }

  async createResumableUploadSession(
    appId: string,
    accessToken: string,
    fileLength: number,
    mimeType: string,
  ): Promise<MetaResumableUploadSessionResponse> {
    const url = this.buildGraphUrl(`/${appId}/uploads`, {
      access_token: accessToken,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_length: fileLength,
        file_type: mimeType,
      }),
    });

    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`Meta resumable upload session failed: ${detail}`);
    }

    return (await response.json()) as MetaResumableUploadSessionResponse;
  }

  async uploadToResumableSession(
    uploadSessionId: string,
    accessToken: string,
    buffer: Buffer,
  ): Promise<string> {
    const url = `${getMetaGraphBaseUrl()}/${uploadSessionId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${accessToken}`,
        file_offset: '0',
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`Meta resumable upload failed: ${detail}`);
    }

    const data = (await response.json()) as MetaResumableUploadResponse;
    if (!data.h) {
      throw new Error('Meta resumable upload did not return a file handle.');
    }

    return data.h;
  }

  async sendWhatsAppTemplate(
    phoneNumberId: string,
    accessToken: string,
    recipientWaId: string,
    template: {
      name: string;
      language: { code: string };
      components?: unknown[];
    },
  ): Promise<{ messageId: string }> {
    const url = this.buildGraphUrl(`/${phoneNumberId}/messages`, {
      access_token: accessToken,
    });

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientWaId,
      type: 'template',
      template,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`WhatsApp template send failed: ${detail}`);
    }

    const data = (await response.json()) as {
      messages?: Array<{ id?: string }>;
    };

    return { messageId: data.messages?.[0]?.id ?? '' };
  }

  /** Subscribe the Meta app to receive WhatsApp webhooks for this WABA. */
  async subscribeWhatsAppBusinessAccountToApp(
    wabaId: string,
    accessToken: string,
  ): Promise<boolean> {
    const url = this.buildGraphUrl(`/${wabaId}/subscribed_apps`, {
      access_token: accessToken,
    });

    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`Meta subscribe WABA to app failed: ${detail}`);
    }

    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  }

  /** Subscribe a Facebook Page to receive messaging webhooks for this app. */
  async subscribePageToMessagingWebhooks(
    pageId: string,
    pageAccessToken: string,
    subscribedFields: readonly string[] = META_MESSAGING_PAGE_WEBHOOK_FIELDS,
  ): Promise<boolean> {
    const url = this.buildGraphUrl(`/${pageId}/subscribed_apps`, {
      access_token: pageAccessToken,
      subscribed_fields: subscribedFields.join(','),
    });

    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(
        `Meta subscribe Page to messaging webhooks failed: ${detail}`,
      );
    }

    const data = (await response.json()) as { success?: boolean | string };
    return data.success === true || data.success === 'true';
  }

  /**
   * Ensure the Meta app is subscribed to webhook fields for a given object type.
   * Required for Instagram messaging (`object: instagram`) in addition to page subscriptions.
   */
  async ensureAppWebhookSubscription(
    object: 'instagram' | 'page',
    fields: readonly string[] = object === 'instagram'
      ? META_INSTAGRAM_APP_WEBHOOK_FIELDS
      : META_MESSAGING_PAGE_WEBHOOK_FIELDS,
  ): Promise<boolean> {
    const callbackUrl = this.metaConfigService.getMetaWebhookCallbackUrl();
    const { appId, appSecret, webhookVerifyToken } =
      this.metaConfigService.getMetaAppConfig();

    if (!callbackUrl || !webhookVerifyToken) {
      throw new Error(
        'Meta webhook callback URL or verify token is not configured',
      );
    }

    if (!callbackUrl.startsWith('https://')) {
      throw new Error(
        'Meta app webhook subscription requires an HTTPS callback URL (set BACKEND_PUBLIC_URL to your HTTPS tunnel, e.g. ngrok)',
      );
    }

    const url = this.buildGraphUrl(`/${appId}/subscriptions`, {
      access_token: `${appId}|${appSecret}`,
      object,
      callback_url: callbackUrl,
      verify_token: webhookVerifyToken,
      fields: fields.join(','),
    });

    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      const detail = this.sanitizeGraphError(await response.text());
      throw new Error(`Meta app webhook subscription failed: ${detail}`);
    }

    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  }
}
