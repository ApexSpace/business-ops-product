import { Injectable, Logger } from '@nestjs/common';
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

const INSTAGRAM_ACCOUNT_FIELDS = 'id,username,name,profile_picture_url';

@Injectable()
export class MetaApiClient {
  private readonly logger = new Logger(MetaApiClient.name);

  constructor(private readonly metaConfigService: MetaConfigService) {}

  async exchangeCodeForToken(
    code: string,
    providerKey?: string,
  ): Promise<MetaTokenResponse> {
    const { appId, appSecret } = this.metaConfigService.getMetaAppConfig();
    const redirectUri = this.metaConfigService.getMetaRedirectUri(providerKey);

    const url = new URL(`${getMetaGraphBaseUrl()}/oauth/access_token`);
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('redirect_uri', redirectUri);
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
   * Lists Facebook Pages the user authorized (user access token).
   * Paginates and requests instagram_business_account with nested fields.
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

  async sendInstagramMessage(
    instagramUserId: string,
    accessToken: string,
    recipientId: string,
    text: string,
    attachments?: Array<{ type: string; url: string }>,
  ): Promise<{ messageId: string }> {
    return this.sendGraphMessages(
      instagramUserId,
      accessToken,
      recipientId,
      text,
      attachments,
      {},
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

      const data =
        (await response.json()) as MetaMessageTemplateListResponse;
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
}
