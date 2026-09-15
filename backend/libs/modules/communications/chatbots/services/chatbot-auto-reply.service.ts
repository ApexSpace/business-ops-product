import { Injectable } from '@nestjs/common';
import { Chatbot, ChatbotRule, ChatbotRuleTriggerType } from '@prisma/client';
import { parseChatbotSettings } from '../utils/chatbot-settings.util';

const HANDOFF_KEYWORDS = [
  'human',
  'agent',
  'representative',
  'person',
  'talk to someone',
  'speak to someone',
];

export type ChatbotAutoReplyResult =
  | { type: 'reply'; text: string }
  | { type: 'handoff'; text: string };

@Injectable()
export class ChatbotAutoReplyService {
  resolveReply(
    chatbot: Chatbot,
    rules: ChatbotRule[],
    inboundText: string,
    options?: { botPaused?: boolean; isOnline?: boolean },
  ): ChatbotAutoReplyResult | null {
    const settings = parseChatbotSettings(chatbot);

    if (options?.botPaused) {
      return null;
    }

    if (!settings.messaging.autoReplyEnabled) {
      return null;
    }

    if (options?.isOnline === false) {
      const offlineMessage =
        settings.messaging.offlineMessage?.trim() ||
        settings.chatWindow.offlineMessage?.trim();
      return offlineMessage ? { type: 'reply', text: offlineMessage } : null;
    }

    const normalized = inboundText.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (this.isHandoffRequest(normalized)) {
      return {
        type: 'handoff',
        text: settings.chatWindow.handoffMessage,
      };
    }

    const activeRules = rules.filter(
      (r) => r.isActive && r.triggerType !== ChatbotRuleTriggerType.FALLBACK,
    );

    for (const rule of activeRules) {
      const trigger = rule.triggerText.trim().toLowerCase();
      if (!trigger) continue;

      if (rule.triggerType === ChatbotRuleTriggerType.EXACT_MATCH) {
        if (normalized === trigger) {
          return { type: 'reply', text: rule.responseText };
        }
      } else if (rule.triggerType === ChatbotRuleTriggerType.CONTAINS) {
        if (normalized.includes(trigger)) {
          return { type: 'reply', text: rule.responseText };
        }
      } else if (rule.triggerType === ChatbotRuleTriggerType.STARTS_WITH) {
        if (normalized.startsWith(trigger)) {
          return { type: 'reply', text: rule.responseText };
        }
      }
    }

    const fallbackRule = rules.find(
      (r) => r.isActive && r.triggerType === ChatbotRuleTriggerType.FALLBACK,
    );
    if (fallbackRule?.responseText) {
      return { type: 'reply', text: fallbackRule.responseText };
    }

    const fallbackMessage = settings.messaging.fallbackMessage?.trim();
    return fallbackMessage ? { type: 'reply', text: fallbackMessage } : null;
  }

  private isHandoffRequest(text: string): boolean {
    return HANDOFF_KEYWORDS.some((kw) => text.includes(kw));
  }
}
