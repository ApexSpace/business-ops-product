import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { RealtimeSocketAuthService } from './realtime-socket-auth.service';

describe('RealtimeSocketAuthService', () => {
  const businessId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';

  function createService(overrides?: {
    payload?: Record<string, unknown>;
    verifyError?: boolean;
  }) {
    const jwtService = {
      verifyAsync: overrides?.verifyError
        ? jest.fn().mockRejectedValue(new Error('invalid'))
        : jest.fn().mockResolvedValue(
            overrides?.payload ?? {
              sub: userId,
              email: 'user@example.com',
              context: 'business',
              businessId,
            },
          ),
    } as unknown as JwtService;

    const configService = {
      get: jest.fn().mockReturnValue('secret'),
    };

    const userRepository = {
      findById: jest.fn().mockResolvedValue({
        id: userId,
        email: 'user@example.com',
        status: UserStatus.ACTIVE,
      }),
    };

    const businessRepository = {
      findById: jest.fn().mockResolvedValue({ id: businessId, deletedAt: null }),
    };

    const accessResolver = {
      resolveForBusiness: jest.fn().mockResolvedValue({ canAccessWorkspace: true }),
    };

    const platformMembershipRepository = {
      findActiveByUserId: jest.fn().mockResolvedValue(null),
    };

    const businessMembershipRepository = {
      findActiveByUserAndBusiness: jest.fn().mockResolvedValue({
        status: 'ACTIVE',
        role: 'OWNER',
      }),
    };

    const service = new RealtimeSocketAuthService(
      jwtService,
      configService as never,
      userRepository as never,
      platformMembershipRepository as never,
      businessMembershipRepository as never,
      businessRepository as never,
      accessResolver as never,
    );

    return { service, jwtService };
  }

  it('authenticates a valid business handshake', async () => {
    const { service } = createService();
    const user = await service.authenticateHandshake('token', businessId);

    expect(user.businessId).toBe(businessId);
    expect(user.id).toBe(userId);
  });

  it('rejects platform-only tokens', async () => {
    const { service } = createService({
      payload: {
        sub: userId,
        email: 'user@example.com',
        context: 'platform',
        platformRole: 'SUPER_ADMIN',
      },
    });

    await expect(
      service.authenticateHandshake('token', businessId),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('rejects businessId mismatch', async () => {
    const { service } = createService();

    await expect(
      service.authenticateHandshake(
        'token',
        '33333333-3333-3333-3333-333333333333',
      ),
    ).rejects.toBeInstanceOf(AppException);
  });
});
