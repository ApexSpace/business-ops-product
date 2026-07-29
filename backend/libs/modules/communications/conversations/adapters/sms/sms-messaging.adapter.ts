import { HttpStatus, Injectable } from '@nestjs/common';
import { ConversationChannel } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { SMS_PROVIDER_KEY } from '@app/modules/communications/sms/constants/sms-platform.constants';
import { assertSmsBodyWithinSegmentLimit } from '@app/modules/communications/sms/utils/sms-segment-limit.util';
import { TwilioApiClient } from '@app/modules/integrations/twilio/services/twilio-api-client';
import { SmsModeResolverService } from '@app/modules/integrations/twilio/services/sms-mode-resolver.service';
import {
  ConversationChannelAdapter,
  SendChannelMessageParams,
  SendChannelMessageResult,
} from '../conversation-channel-adapter.interface';

@Injectable()
export class SmsMessagingAdapter implements ConversationChannelAdapter {
  constructor(
    private readonly smsModeResolver: SmsModeResolverService,
    private readonly twilioApiClient: TwilioApiClient,
  ) {}

  getProviderKey(): string {
    return SMS_PROVIDER_KEY;
  }

  getChannel(): ConversationChannel {
    return ConversationChannel.SMS;
  }

  async sendMessage(
    params: SendChannelMessageParams,
  ): Promise<SendChannelMessageResult> {
    // Prefer business-owned Twilio for inbox. resolveForBusiness still falls
    // back to platform for notification callers; reject that here.
    const context =
      (await this.smsModeResolver.resolveBusinessOwned(params.businessId)) ??
      (await this.smsModeResolver.resolveForBusiness(
        params.businessId,
        params.resourceId,
      ));

    if (!context) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Connect your Twilio number in Settings → Integrations to send SMS from the inbox.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (context.mode === 'platform' || !context.twoWayEnabled) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Two-way SMS requires a connected business Twilio number. Connect Twilio in Settings → Integrations.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const body = params.text?.trim() ?? '';
    if (body) {
      assertSmsBodyWithinSegmentLimit(body);
    }

    const mediaUrl = params.attachments
      ?.map((attachment) => attachment.url)
      .filter(Boolean);

    const result = await this.twilioApiClient.sendMessage({
      accountSid: context.accountSid,
      authToken: context.authToken,
      from: context.fromNumber,
      to: params.externalRecipientId,
      body: params.text,
      statusCallback: this.twilioApiClient.buildStatusCallbackUrl(),
      mediaUrl,
    });

    return {
      externalMessageId: result.sid,
      metadata: {
        fromNumber: context.fromNumber,
        twilioStatus: result.status,
      },
    };
  }
}
