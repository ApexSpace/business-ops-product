import { Injectable } from '@nestjs/common';
import { getMetaGraphBaseUrl } from '../constants/meta-oauth.constants';
import { MetaConfigService } from './meta-config.service';

export interface MetaUserProfile {
  id: string;
  name?: string;
  email?: string;
}

export interface MetaPageAccount {
  id: string;
  name: string;
  access_token?: string;
  category?: string;
  picture?: { data?: { url?: string } };
  tasks?: string[];
  instagram_business_account?: { id: string };
}

export interface MetaInstagramAccount {
  id: string;
  username?: string;
  profile_picture_url?: string;
  linkedPageId: string;
  linkedPageName: string;
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

interface MetaPagesResponse {
  data?: MetaPageAccount[];
}

interface MetaWabaResponse {
  data?: Array<{ id: string; name?: string }>;
}

interface MetaPhoneNumbersResponse {
  data?: MetaWhatsAppPhone[];
}

@Injectable()
export class MetaApiClient {
  constructor(private readonly metaConfigService: MetaConfigService) {}

  async exchangeCodeForToken(
    code: string,
    providerKey?: string,
  ): Promise<MetaTokenResponse> {
    const { appId, appSecret } = this.metaConfigService.getMetaAppConfig();
    const redirectUri = this.metaConfigService.getMetaRedirectUri(providerKey);

    const url = new URL(
      `${getMetaGraphBaseUrl()}/oauth/access_token`,
    );
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
    const url = new URL(
      `${getMetaGraphBaseUrl()}/oauth/access_token`,
    );
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

  async listPages(accessToken: string): Promise<MetaPageAccount[]> {
    const url = new URL(`${getMetaGraphBaseUrl()}/me/accounts`);
    url.searchParams.set(
      'fields',
      'id,name,access_token,category,picture,tasks,instagram_business_account',
    );
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Failed to list Facebook Pages: ${detail}`);
    }

    const data = (await response.json()) as MetaPagesResponse;
    return data.data ?? [];
  }

  async listInstagramAccounts(
    userAccessToken: string,
    pages: MetaPageAccount[],
  ): Promise<MetaInstagramAccount[]> {
    const accounts: MetaInstagramAccount[] = [];

    for (const page of pages) {
      const igId = page.instagram_business_account?.id;
      if (!igId) continue;

      const pageToken = page.access_token ?? userAccessToken;

      const url = new URL(`${getMetaGraphBaseUrl()}/${igId}`);
      url.searchParams.set(
        'fields',
        'id,username,profile_picture_url',
      );
      url.searchParams.set('access_token', pageToken);

      const response = await fetch(url.toString());
      if (!response.ok) continue;

      const ig = (await response.json()) as {
        id: string;
        username?: string;
        profile_picture_url?: string;
      };

      accounts.push({
        id: ig.id,
        username: ig.username,
        profile_picture_url: ig.profile_picture_url,
        linkedPageId: page.id,
        linkedPageName: page.name,
      });
    }

    return accounts;
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
        const phones = await this.listPhoneNumbersForWaba(
          waba.id,
          accessToken,
        );
        result.push({
          id: waba.id,
          name: waba.name,
          phoneNumbers: phones,
        });
      }
    }

    return result;
  }

  async listPhoneNumbersForWaba(
    wabaId: string,
    accessToken: string,
  ): Promise<MetaWhatsAppPhone[]> {
    const url = new URL(
      `${getMetaGraphBaseUrl()}/${wabaId}/phone_numbers`,
    );
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
}
