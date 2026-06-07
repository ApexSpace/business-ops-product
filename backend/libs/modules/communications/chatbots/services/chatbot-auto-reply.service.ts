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

@Injectable()
export class ChatbotAutoReplyService {
  resolveReply(
    chatbot: Chatbot,
    rules: ChatbotRule[],
    inboundText: string,
  ): string | null {
    const settings = parseChatbotSettings(chatbot);
    if (!settings.messaging.autoReplyEnabled || settings.messaging.aiEnabled) {
      return null;
    }

    const normalized = inboundText.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (this.isHandoffRequest(normalized)) {
      return settings.chatWindow.handoffMessage;
    }

    const activeRules = rules.filter(
      (r) => r.isActive && r.triggerType !== ChatbotRuleTriggerType.FALLBACK,
    );

    for (const rule of activeRules) {
      const trigger = rule.triggerText.trim().toLowerCase();
      if (!trigger) continue;

      if (rule.triggerType === ChatbotRuleTriggerType.EXACT_MATCH) {
        if (normalized === trigger) return rule.responseText;
      } else if (rule.triggerType === ChatbotRuleTriggerType.CONTAINS) {
        if (normalized.includes(trigger)) return rule.responseText;
      } else if (rule.triggerType === ChatbotRuleTriggerType.STARTS_WITH) {
        if (normalized.startsWith(trigger)) return rule.responseText;
      }
    }

    const fallbackRule = rules.find(
      (r) => r.isActive && r.triggerType === ChatbotRuleTriggerType.FALLBACK,
    );
    if (fallbackRule?.responseText) {
      return fallbackRule.responseText;
    }

    return settings.messaging.fallbackMessage;
  }

  private isHandoffRequest(text: string): boolean {
    return HANDOFF_KEYWORDS.some((kw) => text.includes(kw));
  }
}
