import {
  isBusinessHoursEnforced,
  isChatbotOnline,
} from './chatbot-business-hours.util';
import type {
  ChatbotBusinessHoursSettings,
  ChatbotMessagingSettings,
} from '../types/chatbot-settings.types';

const baseMessaging: ChatbotMessagingSettings = {
  welcomeMessage: 'Hi',
  fallbackMessage: 'Fallback',
  offlineMessage: 'Offline',
  autoReplyEnabled: true,
  aiEnabled: false,
  businessHoursOnly: false,
};

const baseHours: ChatbotBusinessHoursSettings = {
  enabled: true,
  timezone: 'UTC',
  schedule: {
    '5': [{ start: '09:00', end: '17:00' }],
  },
};

describe('chatbot-business-hours.util', () => {
  it('returns online when business hours are not enforced', () => {
    expect(
      isChatbotOnline(
        { ...baseHours, enabled: false },
        { ...baseMessaging, businessHoursOnly: false },
        new Date('2026-06-19T12:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('returns offline outside configured intervals', () => {
    expect(
      isChatbotOnline(
        baseHours,
        { ...baseMessaging, businessHoursOnly: true },
        new Date('2026-06-19T20:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('returns online inside configured intervals', () => {
    expect(
      isChatbotOnline(
        baseHours,
        { ...baseMessaging, businessHoursOnly: true },
        new Date('2026-06-19T12:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('detects when business hours are enforced', () => {
    expect(
      isBusinessHoursEnforced(
        { ...baseHours, enabled: false },
        { ...baseMessaging, businessHoursOnly: true },
      ),
    ).toBe(true);
  });
});
