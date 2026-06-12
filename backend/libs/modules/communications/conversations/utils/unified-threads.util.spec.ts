import { ConversationChannel, ConversationStatus } from '@prisma/client';
import { groupConversationsIntoUnifiedThreads } from './unified-threads.util';

function conversation(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: 'conv-1',
    businessId: 'biz-1',
    contactId: 'contact-1',
    channel: ConversationChannel.WHATSAPP,
    providerKey: 'whatsapp',
    resourceId: 'res-1',
    externalConversationId: 'ext-1',
    externalParticipantId: '923',
    externalPageId: null,
    title: null,
    status: ConversationStatus.OPEN,
    assignedToUserId: null,
    lastMessageAt: new Date('2026-06-11T12:00:00.000Z'),
    lastMessagePreview: 'Latest',
    unreadCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: null,
    deletedAt: null,
    contact: {
      id: 'contact-1',
      displayName: 'Shahbaz',
      firstName: 'Shahbaz',
      lastName: null,
      avatarUrl: null,
    },
    assignedTo: null,
    ...overrides,
  };
}

describe('groupConversationsIntoUnifiedThreads', () => {
  it('merges conversations for the same contact into one thread', () => {
    const threads = groupConversationsIntoUnifiedThreads([
      conversation({
        id: 'wa-conv',
        channel: ConversationChannel.WHATSAPP,
        lastMessageAt: new Date('2026-06-11T12:00:00.000Z'),
        lastMessagePreview: 'WhatsApp hi',
        unreadCount: 2,
      }),
      conversation({
        id: 'email-conv',
        channel: ConversationChannel.EMAIL,
        providerKey: 'email',
        lastMessageAt: new Date('2026-06-11T13:00:00.000Z'),
        lastMessagePreview: 'Email hi',
        unreadCount: 1,
      }),
    ]);

    expect(threads).toHaveLength(1);
    expect(threads[0]?.threadKey).toBe('contact-1');
    expect(threads[0]?.channels).toEqual(
      expect.arrayContaining([
        ConversationChannel.WHATSAPP,
        ConversationChannel.EMAIL,
      ]),
    );
    expect(threads[0]?.unreadCount).toBe(3);
    expect(threads[0]?.primaryConversationId).toBe('email-conv');
    expect(threads[0]?.lastMessagePreview).toBe('Email hi');
  });

  it('keeps orphan conversations as standalone threads', () => {
    const threads = groupConversationsIntoUnifiedThreads([
      conversation({ id: 'orphan', contactId: null, contact: null }),
    ]);

    expect(threads).toHaveLength(1);
    expect(threads[0]?.threadKey).toBe('orphan');
    expect(threads[0]?.contactId).toBeNull();
  });

  it('filters threads by channel while keeping all contact conversations in the thread', () => {
    const threads = groupConversationsIntoUnifiedThreads(
      [
        conversation({
          id: 'wa-conv',
          channel: ConversationChannel.WHATSAPP,
        }),
        conversation({
          id: 'email-conv',
          channel: ConversationChannel.EMAIL,
          providerKey: 'email',
        }),
      ],
      { channel: ConversationChannel.WHATSAPP },
    );

    expect(threads).toHaveLength(1);
    expect(threads[0]?.conversations).toHaveLength(2);
  });
});
