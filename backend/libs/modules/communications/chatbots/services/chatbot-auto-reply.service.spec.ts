import { ChatbotRuleTriggerType, type Chatbot } from '@prisma/client';
import { ChatbotAutoReplyService } from './chatbot-auto-reply.service';
import { defaultSettingsBundle } from '../utils/chatbot-settings.util';

describe('ChatbotAutoReplyService', () => {
  const service = new ChatbotAutoReplyService();
  const bundle = defaultSettingsBundle();

  const chatbot = {
    appearanceSettings: bundle.appearance,
    chatWindowSettings: bundle.chatWindow,
    messagingSettings: bundle.messaging,
    businessHoursSettings: bundle.businessHours,
    formSettings: bundle.form,
    botSettings: bundle.bot,
  } as Chatbot;

  const rules = [
    {
      id: '1',
      triggerType: ChatbotRuleTriggerType.CONTAINS,
      triggerText: 'hours',
      responseText: 'We are open 9-5.',
      sortOrder: 0,
      isActive: true,
    },
  ] as never[];

  it('matches keyword rules', () => {
    expect(
      service.resolveReply(chatbot, rules, 'What are your hours?'),
    ).toEqual({
      type: 'reply',
      text: 'We are open 9-5.',
    });
  });

  it('returns handoff result for human requests', () => {
    expect(service.resolveReply(chatbot, rules, 'talk to a human')).toEqual({
      type: 'handoff',
      text: defaultSettingsBundle().chatWindow.handoffMessage,
    });
  });

  it('skips replies when bot is paused', () => {
    expect(
      service.resolveReply(chatbot, rules, 'hours', { botPaused: true }),
    ).toBeNull();
  });

  it('returns offline message when outside business hours', () => {
    expect(
      service.resolveReply(chatbot, rules, 'hello', { isOnline: false }),
    ).toEqual({
      type: 'reply',
      text: defaultSettingsBundle().messaging.offlineMessage,
    });
  });
});
