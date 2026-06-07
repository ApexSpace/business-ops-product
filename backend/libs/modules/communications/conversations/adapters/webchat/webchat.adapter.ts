import { Injectable } from '@nestjs/common';
import { ConversationChannel } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  ConversationChannelAdapter,
  SendChannelMessageParams,
  SendChannelMessageResult,
} from '../conversation-channel-adapter.interface';
import { WEBCHAT_PROVIDER_KEY } from '@app/modules/communications/chatbots/utils/chatbot-public-key.util';

/** Website chat — delivery is via DB polling in the public widget. */
@Injectable()
export class WebchatAdapter implements ConversationChannelAdapter {
  getProviderKey(): string {
    return WEBCHAT_PROVIDER_KEY;
  }

  getChannel(): ConversationChannel {
    return ConversationChannel.WEBCHAT;
  }

  async sendMessage(
    _params: SendChannelMessageParams,
  ): Promise<SendChannelMessageResult> {
    return {
      externalMessageId: `webchat-out-${randomUUID()}`,
    };
  }
}
