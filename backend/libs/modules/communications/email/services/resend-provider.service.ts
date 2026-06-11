import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { RootConfig } from '@app/core/config/configuration';

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string | null;
  replyTo?: string | null;
}

export interface SendEmailResult {
  providerMessageId: string;
}

export interface ReceivedEmailContent {
  from?: string;
  to?: string[];
  subject?: string;
  text?: string | null;
  html?: string | null;
  message_id?: string;
  headers?: Record<string, string | string[]>;
}

@Injectable()
export class ResendProviderService {
  private readonly logger = new Logger(ResendProviderService.name);
  private client: Resend | null = null;

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  isConfigured(): boolean {
    const email = this.configService.get('email', { infer: true });
    return email.enabled && !!email.resend.apiKey && !!email.defaultFrom;
  }

  private getClient(): Resend {
    const apiKey = this.configService.get('email.resend.apiKey', {
      infer: true,
    });
    if (!apiKey) {
      throw new Error('Resend API key is not configured');
    }
    if (!this.client) {
      this.client = new Resend(apiKey);
    }
    return this.client;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const client = this.getClient();
    try {
      const response = await client.emails.send({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text ?? undefined,
        replyTo: params.replyTo ?? undefined,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const providerMessageId = response.data?.id;
      if (!providerMessageId) {
        throw new Error('Resend did not return a message id');
      }

      return { providerMessageId };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to send email via Resend';
      this.logger.error(`Resend send failed: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  async getReceivedEmail(emailId: string): Promise<ReceivedEmailContent> {
    const client = this.getClient();
    const response = await client.emails.receiving.get(emailId);

    if (response.error) {
      throw new Error(response.error.message);
    }

    const email = response.data;
    if (!email) {
      throw new Error('Resend did not return received email content');
    }

    return {
      from: email.from,
      to: Array.isArray(email.to) ? email.to : email.to ? [email.to] : undefined,
      subject: email.subject,
      text: email.text,
      html: email.html,
      message_id: email.message_id,
      headers: email.headers as Record<string, string | string[]> | undefined,
    };
  }
}
