import { Injectable } from '@nestjs/common';
import {
  ChatbotIdentityRefType,
  ChatbotSession,
  ChatbotSessionIdentityType,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type PersonalizationContext = {
  identityType: ChatbotSessionIdentityType;
  displayName: string | null;
  contextBlock: string | null;
  profile: Record<string, unknown>;
};

/**
 * Scaffold for chatbot reply personalization.
 * Steps 3 (RAG), 4 (tools), 7 (handoff) are stubs for later.
 */
@Injectable()
export class ChatbotPersonalizationPipelineService {
  constructor(private readonly prisma: PrismaService) {}

  async buildContext(session: ChatbotSession): Promise<PersonalizationContext> {
    if (session.identityType === ChatbotSessionIdentityType.ANONYMOUS) {
      return {
        identityType: session.identityType,
        displayName: null,
        contextBlock: null,
        profile: {},
      };
    }

    if (
      session.identityType === ChatbotSessionIdentityType.ANONYMOUS_WITH_PROFILE
    ) {
      const displayName = session.visitorName?.trim() || null;
      const profile: Record<string, unknown> = {
        visitorName: session.visitorName,
        visitorEmail: session.visitorEmail,
        unverified: true,
      };
      return {
        identityType: session.identityType,
        displayName,
        contextBlock: displayName
          ? `You're speaking with ${displayName} (self-reported, unverified).`
          : session.visitorEmail
            ? `Visitor email (unverified): ${session.visitorEmail}.`
            : null,
        profile,
      };
    }

    // AUTHENTICATED — derive displayName on read from identityRefId + identityRefType
    const derived = await this.deriveAuthenticated(session);
    return {
      identityType: session.identityType,
      displayName: derived.displayName,
      contextBlock: derived.displayName
        ? `You're speaking with ${derived.displayName}, an authenticated ${
            session.identityRefType === ChatbotIdentityRefType.CONTACT
              ? 'customer'
              : 'platform customer'
          }.`
        : null,
      profile: derived.profile,
    };
  }

  /**
   * Future: retrieve knowledge chunks. Stub returns empty.
   */
  async retrieveKnowledge(_query: string): Promise<string[]> {
    return [];
  }

  /**
   * Future: tool definitions. Stub returns empty.
   */
  async toolDefinitions(): Promise<unknown[]> {
    return [];
  }

  /**
   * Future: human handoff evaluation. Stub returns false.
   */
  async needsHandoff(_text: string): Promise<boolean> {
    return false;
  }

  composePromptParts(input: {
    systemPrompt?: string;
    contextBlock: string | null;
    knowledgeChunks: string[];
    historySummary?: string;
  }): string {
    const parts: string[] = [];
    if (input.systemPrompt?.trim()) parts.push(input.systemPrompt.trim());
    if (input.contextBlock?.trim()) parts.push(input.contextBlock.trim());
    if (input.knowledgeChunks.length) {
      parts.push(`Knowledge:\n${input.knowledgeChunks.join('\n')}`);
    }
    if (input.historySummary?.trim()) {
      parts.push(input.historySummary.trim());
    }
    return parts.join('\n\n');
  }

  private async deriveAuthenticated(session: ChatbotSession): Promise<{
    displayName: string | null;
    profile: Record<string, unknown>;
  }> {
    if (!session.identityRefId || !session.identityRefType) {
      return { displayName: session.visitorName?.trim() || null, profile: {} };
    }

    if (session.identityRefType === ChatbotIdentityRefType.CONTACT) {
      const contact = await this.prisma.contact.findFirst({
        where: {
          id: session.identityRefId,
          businessId: session.businessId,
          deletedAt: null,
        },
        select: {
          displayName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });
      if (!contact) {
        return { displayName: session.visitorName?.trim() || null, profile: {} };
      }
      const displayName =
        contact.displayName?.trim() ||
        [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
        contact.email ||
        null;
      return {
        displayName,
        profile: {
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
        },
      };
    }

    const user = await this.prisma.user.findFirst({
      where: { id: session.identityRefId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!user) {
      return { displayName: session.visitorName?.trim() || null, profile: {} };
    }
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email ||
      null;
    return {
      displayName,
      profile: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
