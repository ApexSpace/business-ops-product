import type { ChatbotIdentityRefType } from '@prisma/client';

export type ResolvedChatIdentity = {
  id: string;
  refType: ChatbotIdentityRefType;
  displayName: string;
  profile: Record<string, unknown>;
};

export interface ChatIdentityResolver {
  resolve(jwt: string, chatbotBusinessId: string): Promise<ResolvedChatIdentity>;
}
