import { ConversationChannel } from '@prisma/client';

export function buildExternalConversationId(
  channel: ConversationChannel,
  resourceExternalId: string,
  participantId: string,
): string {
  return `${channel}:${resourceExternalId}:${participantId}`;
}
