import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import {
  assertCanViewConversation,
  canViewAllConversations,
  canViewConversation,
  resolveAssignedConversationScope,
} from './conversation-staff-access.util';

describe('conversation-staff-access.util', () => {
  const member = (permissions: Record<string, boolean> = {}): RequestUser =>
    ({
      id: 'user-1',
      businessId: 'biz-1',
      context: 'business',
      businessRole: 'MEMBER',
      staffPermissions: permissions,
    }) as RequestUser;

  it('allows admins to view all conversations', () => {
    const admin = {
      ...member(),
      businessRole: 'ADMIN',
      staffPermissions: {},
    } as RequestUser;
    expect(canViewAllConversations(admin)).toBe(true);
    expect(
      canViewConversation(admin, { assignedToUserId: 'someone-else' }),
    ).toBe(true);
  });

  it('scopes members without view_all to their assignments', () => {
    const user = member({ 'conversations.access': true });
    expect(canViewAllConversations(user)).toBe(false);
    expect(canViewConversation(user, { assignedToUserId: 'user-1' })).toBe(
      true,
    );
    expect(
      canViewConversation(user, { assignedToUserId: 'other' }),
    ).toBe(false);
    expect(canViewConversation(user, { assignedToUserId: null })).toBe(false);
    expect(resolveAssignedConversationScope(user)).toEqual({
      assignedToUserId: 'user-1',
    });
  });

  it('lets view_all see unassigned and others’ threads', () => {
    const user = member({
      'conversations.access': true,
      'conversations.view_all': true,
    });
    expect(canViewAllConversations(user)).toBe(true);
    expect(canViewConversation(user, { assignedToUserId: null })).toBe(true);
    expect(resolveAssignedConversationScope(user, { assignedToMe: true })).toEqual(
      { assignedToMe: true },
    );
  });

  it('asserts forbidden for scoped members', () => {
    expect(() =>
      assertCanViewConversation(member(), { assignedToUserId: 'other' }),
    ).toThrow(/permission to view this conversation/);
  });

  it('lets platform ops roles view all conversations', () => {
    const platformAdmin = {
      id: 'platform-1',
      email: 'ops@example.com',
      context: 'platform',
      platformRole: 'PLATFORM_ADMIN',
    } as RequestUser;
    expect(canViewAllConversations(platformAdmin)).toBe(true);
    expect(
      canViewConversation(platformAdmin, { assignedToUserId: 'someone-else' }),
    ).toBe(true);
    expect(
      resolveAssignedConversationScope(platformAdmin, { assignedToMe: true }),
    ).toEqual({ assignedToMe: true });
  });
});
