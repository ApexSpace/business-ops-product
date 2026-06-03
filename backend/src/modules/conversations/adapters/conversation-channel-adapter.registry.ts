import { HttpStatus, Injectable } from '@nestjs/common';
import { ConversationChannel } from '@prisma/client';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { ConversationChannelAdapter } from './conversation-channel-adapter.interface';
import { FacebookMessengerAdapter } from './meta/facebook-messenger.adapter';
import { InstagramMessagingAdapter } from './meta/instagram-messaging.adapter';

@Injectable()
export class ConversationChannelAdapterRegistry {
  private readonly byChannel = new Map<ConversationChannel, ConversationChannelAdapter>();

  constructor(
    facebookAdapter: FacebookMessengerAdapter,
    instagramAdapter: InstagramMessagingAdapter,
  ) {
    this.byChannel.set(ConversationChannel.FACEBOOK, facebookAdapter);
    this.byChannel.set(ConversationChannel.INSTAGRAM, instagramAdapter);
  }

  getAdapter(channel: ConversationChannel): ConversationChannelAdapter {
    const adapter = this.byChannel.get(channel);
    if (!adapter) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        `Messaging is not supported for channel ${channel}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return adapter;
  }
}
