import { ConversationChannel } from '@prisma/client';
import { EMAIL_PROVIDER_KEY } from '../constants/email-platform.constants';

export function isPlatformEmailConversation(
  channel: ConversationChannel,
  providerKey: string,
): boolean {
  return channel === ConversationChannel.EMAIL && providerKey === EMAIL_PROVIDER_KEY;
}
