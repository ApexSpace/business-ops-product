import { HttpStatus, Injectable } from '@nestjs/common';
import { ConversationChannel } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { ConversationChannelAdapter } from './conversation-channel-adapter.interface';
import { FacebookMessengerAdapter } from './meta/facebook-messenger.adapter';
import { InstagramMessagingAdapter } from './meta/instagram-messaging.adapter';
import { WhatsAppMessagingAdapter } from './meta/whatsapp-messaging.adapter';
import { WebchatAdapter } from './webchat/webchat.adapter';

@Injectable()
export class ConversationChannelAdapterRegistry {
  private readonly byChannel = new Map<
    ConversationChannel,
    ConversationChannelAdapter
  >();

  constructor(
    facebookAdapter: FacebookMessengerAdapter,
    instagramAdapter: InstagramMessagingAdapter,
    whatsappAdapter: WhatsAppMessagingAdapter,
    webchatAdapter: WebchatAdapter,
  ) {
    this.byChannel.set(ConversationChannel.FACEBOOK, facebookAdapter);
    this.byChannel.set(ConversationChannel.INSTAGRAM, instagramAdapter);
    this.byChannel.set(ConversationChannel.WHATSAPP, whatsappAdapter);
    this.byChannel.set(ConversationChannel.WEBCHAT, webchatAdapter);
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
