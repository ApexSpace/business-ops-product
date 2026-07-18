import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';
import type { RootConfig } from '@app/core/config/configuration';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';

/**
 * Per-request timeout for Twilio API calls. The Twilio SDK defaults to 30s,
 * which is at/over the frontend BFF proxy abort (30s) — a slow Twilio response
 * surfaces as an opaque gateway timeout. Fail fast with a clear error instead.
 */
const TWILIO_REQUEST_TIMEOUT_MS = 15000;

export interface TwilioSendMessageParams {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
  statusCallback?: string;
  mediaUrl?: string[];
}

export interface TwilioSendMessageResult {
  sid: string;
  status: string;
}

export interface TwilioPhoneNumberSummary {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
}

@Injectable()
export class TwilioApiClient {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  createClient(accountSid: string, authToken: string) {
    return Twilio(accountSid, authToken, {
      httpClient: new Twilio.RequestClient({
        timeout: TWILIO_REQUEST_TIMEOUT_MS,
      }),
      autoRetry: false,
    });
  }

  async listSmsPhoneNumbers(
    accountSid: string,
    authToken: string,
  ): Promise<TwilioPhoneNumberSummary[]> {
    const client = this.createClient(accountSid, authToken);
    let numbers: Awaited<ReturnType<typeof client.incomingPhoneNumbers.list>>;
    try {
      // Listing already authenticates the request, so we skip a separate
      // credential-validation round-trip and map auth failures here instead.
      numbers = await client.incomingPhoneNumbers.list({ limit: 100 });
    } catch (error) {
      throw this.toApiException(error);
    }
    return numbers
      .filter((n) => n.capabilities?.sms)
      .map((n) => ({
        sid: n.sid,
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
      }));
  }

  async validateCredentials(
    accountSid: string,
    authToken: string,
  ): Promise<void> {
    try {
      const client = this.createClient(accountSid, authToken);
      await client.api.accounts(accountSid).fetch();
    } catch (error) {
      throw this.toApiException(error);
    }
  }

  /**
   * Normalize Twilio/network failures into a user-facing AppException:
   * auth errors → "invalid credentials", timeouts → "Twilio timed out".
   */
  private toApiException(error: unknown): AppException {
    const status = (error as { status?: number } | null)?.status;
    if (status === 401 || status === 403) {
      return new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid Twilio Account SID or Auth Token',
        HttpStatus.BAD_REQUEST,
      );
    }

    const code = (error as { code?: string } | null)?.code;
    const isTimeout =
      code === 'ETIMEDOUT' ||
      code === 'ESOCKETTIMEDOUT' ||
      code === 'ECONNABORTED' ||
      (error instanceof Error && /timeout/i.test(error.message));
    if (isTimeout) {
      return new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Twilio did not respond in time. Please try again.',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    return new AppException(
      ErrorCode.BAD_REQUEST,
      'Could not reach Twilio. Check your credentials and try again.',
      HttpStatus.BAD_REQUEST,
    );
  }

  async sendMessage(
    params: TwilioSendMessageParams,
  ): Promise<TwilioSendMessageResult> {
    const client = this.createClient(params.accountSid, params.authToken);
    try {
      const message = await client.messages.create({
        from: params.from,
        to: params.to,
        body: params.body,
        ...(params.statusCallback
          ? { statusCallback: params.statusCallback }
          : {}),
        ...(params.mediaUrl?.length ? { mediaUrl: params.mediaUrl } : {}),
      });
      return { sid: message.sid, status: message.status };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Twilio SMS send failed';
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async configureIncomingSmsWebhook(
    accountSid: string,
    authToken: string,
    phoneNumberSid: string,
    smsUrl: string,
  ): Promise<void> {
    const client = this.createClient(accountSid, authToken);
    await client.incomingPhoneNumbers(phoneNumberSid).update({
      smsUrl,
      smsMethod: 'POST',
    });
  }

  validateWebhookSignature(
    authToken: string,
    signature: string | undefined,
    url: string,
    params: Record<string, string>,
  ): boolean {
    if (!signature) return false;
    return Twilio.validateRequest(authToken, signature, url, params);
  }

  buildStatusCallbackUrl(): string | undefined {
    const base = this.configService.get('app.backendPublicUrl', { infer: true });
    if (!base || !this.isPublicWebhookBaseUrl(base)) return undefined;
    return `${base.replace(/\/$/, '')}/api/v1/webhooks/twilio/sms/status`;
  }

  buildInboundWebhookUrl(): string | undefined {
    const base = this.configService.get('app.backendPublicUrl', { infer: true });
    if (!base || !this.isPublicWebhookBaseUrl(base)) return undefined;
    return `${base.replace(/\/$/, '')}/api/v1/webhooks/twilio/sms`;
  }

  /**
   * Twilio rejects localhost / private hosts for StatusCallback and inbound webhooks.
   * In local dev, omit callbacks so outbound SMS still works.
   */
  private isPublicWebhookBaseUrl(base: string): boolean {
    try {
      const { hostname, protocol } = new URL(base);
      if (protocol !== 'https:' && protocol !== 'http:') return false;
      const host = hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host.endsWith('.local') ||
        host.endsWith('.internal')
      ) {
        return false;
      }
      // Twilio requires a publicly reachable URL; prefer https in production,
      // but allow http tunnels (ngrok http) when not localhost.
      return true;
    } catch {
      return false;
    }
  }
}
