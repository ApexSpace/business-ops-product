import { JwtService } from '@nestjs/jwt';
import { AuthActionTokenService } from './auth-action-token.service';

describe('AuthActionTokenService', () => {
  const configService = {
    get: jest.fn(() => 'test-access-secret-min-16-chars'),
  };

  it('signs and verifies email verification tokens', async () => {
    const jwtService = new JwtService({});
    const service = new AuthActionTokenService(
      jwtService,
      configService as never,
    );

    const token = await service.sign('user-1', 'email_verification');
    const userId = await service.verify(token, 'email_verification');

    expect(userId).toBe('user-1');
  });

  it('rejects tokens with a mismatched purpose payload', async () => {
    const jwtService = new JwtService({});
    const service = new AuthActionTokenService(
      jwtService,
      configService as never,
    );

    const token = await jwtService.signAsync(
      { sub: 'user-1', purpose: 'password_reset' },
      { secret: 'test-access-secret-min-16-chars', expiresIn: '1h' },
    );

    await expect(
      service.verify(token, 'email_verification'),
    ).rejects.toThrow('Invalid or expired token');
  });
});
