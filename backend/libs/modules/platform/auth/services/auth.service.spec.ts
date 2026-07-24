import { UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService password reset', () => {
  const userRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByPasswordResetTokenHash: jest.fn(),
    setPasswordResetToken: jest.fn(),
    updatePasswordAndClearResetToken: jest.fn(),
  };
  const refreshTokenRepository = {
    revokeAllForUser: jest.fn(),
  };
  const tokenService = {
    hashToken: jest.fn((token: string) => `hash:${token}`),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'auth.bcryptRounds') return 4;
      if (key === 'app.frontendUrl') return 'https://app.example.com';
      return undefined;
    }),
  };
  const emailNotificationService = {
    enqueueTransactionalEmail: jest.fn().mockResolvedValue(undefined),
  };

  const unused = {} as never;

  const service = new AuthService(
    userRepository as never,
    unused,
    refreshTokenRepository as never,
    unused,
    unused,
    unused,
    tokenService as never,
    configService as never,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    emailNotificationService as never,
    unused,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    emailNotificationService.enqueueTransactionalEmail.mockResolvedValue(
      undefined,
    );
  });

  describe('forgotPassword', () => {
    it('always returns sent true for unknown emails', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.forgotPassword('missing@example.com'),
      ).resolves.toEqual({ sent: true });
      expect(
        emailNotificationService.enqueueTransactionalEmail,
      ).not.toHaveBeenCalled();
    });

    it('always returns sent true for suspended users without emailing', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.forgotPassword('suspended@example.com'),
      ).resolves.toEqual({ sent: true });
      expect(
        emailNotificationService.enqueueTransactionalEmail,
      ).not.toHaveBeenCalled();
    });

    it('stores a hashed token and enqueues reset email for active users', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
      });
      userRepository.findById.mockResolvedValue({
        id: 'user-1',
        email: 'active@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
      userRepository.setPasswordResetToken.mockResolvedValue({});

      await expect(
        service.forgotPassword('active@example.com'),
      ).resolves.toEqual({ sent: true });

      await new Promise((resolve) => setImmediate(resolve));

      expect(userRepository.setPasswordResetToken).toHaveBeenCalledWith(
        'user-1',
        expect.stringMatching(/^hash:/),
        expect.any(Date),
      );
      expect(
        emailNotificationService.enqueueTransactionalEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'auth.password_reset',
          toEmail: 'active@example.com',
          variables: expect.objectContaining({
            reset_link: expect.stringContaining(
              'https://app.example.com/reset-password?token=',
            ),
          }),
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('rejects missing, expired, or inactive tokens', async () => {
      userRepository.findByPasswordResetTokenHash.mockResolvedValue(null);
      await expect(
        service.resetPassword('bad-token', 'newpassword'),
      ).rejects.toThrow('Invalid or expired token');

      userRepository.findByPasswordResetTokenHash.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
        passwordResetExpiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        service.resetPassword('expired-token', 'newpassword'),
      ).rejects.toThrow('Invalid or expired token');

      userRepository.findByPasswordResetTokenHash.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.SUSPENDED,
        passwordResetExpiresAt: new Date(Date.now() + 60_000),
      });
      await expect(
        service.resetPassword('suspended-token', 'newpassword'),
      ).rejects.toThrow('Invalid or expired token');
    });

    it('updates password, clears token, revokes sessions, and notifies', async () => {
      userRepository.findByPasswordResetTokenHash.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
        passwordResetExpiresAt: new Date(Date.now() + 60_000),
      });
      userRepository.updatePasswordAndClearResetToken.mockResolvedValue(1);
      refreshTokenRepository.revokeAllForUser.mockResolvedValue(1);
      userRepository.findById.mockResolvedValue({
        id: 'user-1',
        email: 'active@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

      await expect(
        service.resetPassword('good-token', 'newpassword'),
      ).resolves.toEqual({ reset: true });

      expect(tokenService.hashToken).toHaveBeenCalledWith('good-token');
      expect(
        userRepository.updatePasswordAndClearResetToken,
      ).toHaveBeenCalledWith('user-1', expect.any(String), 'hash:good-token');
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        'user-1',
      );

      await new Promise((resolve) => setImmediate(resolve));

      expect(
        emailNotificationService.enqueueTransactionalEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'auth.password_changed',
          toEmail: 'active@example.com',
        }),
      );
    });

    it('rejects a second use after the token was cleared', async () => {
      userRepository.findByPasswordResetTokenHash
        .mockResolvedValueOnce({
          id: 'user-1',
          status: UserStatus.ACTIVE,
          passwordResetExpiresAt: new Date(Date.now() + 60_000),
        })
        .mockResolvedValueOnce(null);
      userRepository.updatePasswordAndClearResetToken.mockResolvedValue(1);
      refreshTokenRepository.revokeAllForUser.mockResolvedValue(1);
      userRepository.findById.mockResolvedValue({
        id: 'user-1',
        email: 'active@example.com',
      });

      await expect(
        service.resetPassword('good-token', 'newpassword'),
      ).resolves.toEqual({ reset: true });
      await expect(
        service.resetPassword('good-token', 'anotherpassword'),
      ).rejects.toThrow('Invalid or expired token');
    });
  });
});
