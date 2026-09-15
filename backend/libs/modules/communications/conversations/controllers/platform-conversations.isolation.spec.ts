import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { INTERNAL_OPS_BUSINESS_ID } from '@app/modules/platform/business/utils/tenant-business-scope.util';
import { canViewAllConversations } from '../utils/conversation-staff-access.util';

describe('platform conversations isolation', () => {
  it('treats platform ops roles as view-all', () => {
    const user = {
      id: 'platform-1',
      email: 'ops@example.com',
      context: 'platform',
      platformRole: 'SUPER_ADMIN',
    } as RequestUser;

    expect(canViewAllConversations(user)).toBe(true);
  });

  it('does not use JWT businessId for INTERNAL ops scoping', () => {
    // Controllers must resolve tenant via InternalBusinessService only.
    // This constant is the seeded ops workspace — never accept client businessId.
    expect(INTERNAL_OPS_BUSINESS_ID).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
  });
});
