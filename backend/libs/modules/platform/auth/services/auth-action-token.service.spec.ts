import { JwtService } from '@nestjs/jwt';
import { AuthActionTokenService } from './auth-action-token.service';

describe('AuthActionTokenService', () => {
  const configService = {
    get: jest.fn(() => 'test-access-secret-min-16-chars'),
  };

  it('signs and verifies password reset tokens', async () => {
    const jwtService = new JwtService({});
    const service = new AuthActionTokenService(
      jwtService,
      configService as never,
    );

    const token = await service.sign('user-1', 'password_reset');
    const userId = await service.verify(token, 'password_reset');

    expect(userId).toBe('user-1');
  });

  it('rejects tokens with the wrong purpose', async () => {
    const jwtService = new JwtService({});
    const service = new AuthActionTokenService(
      jwtService,
      configService as never,
    );

    const token = await service.sign('user-1', 'email_verification');

    await expect(service.verify(token, 'password_reset')).rejects.toThrow(
      'Invalid or expired token',
    );
  });
});
