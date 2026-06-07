import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RootConfig } from '@app/core/config/configuration';

export type AuthEmailAction = 'password_reset' | 'email_verification';

export interface AuthActionTokenPayload {
  sub: string;
  purpose: AuthEmailAction;
}

@Injectable()
export class AuthActionTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  async sign(userId: string, purpose: AuthEmailAction): Promise<string> {
    const secret = this.configService.get('jwt.accessSecret', { infer: true });
    const expiresIn =
      purpose === 'password_reset'
        ? '1h'
        : ('24h' as `${number}${'s' | 'm' | 'h' | 'd'}`);

    return this.jwtService.signAsync(
      { sub: userId, purpose } satisfies AuthActionTokenPayload,
      { secret, expiresIn },
    );
  }

  async verify(token: string, purpose: AuthEmailAction): Promise<string> {
    const secret = this.configService.get('jwt.accessSecret', { infer: true });

    try {
      const payload = await this.jwtService.verifyAsync<AuthActionTokenPayload>(
        token,
        { secret },
      );

      if (payload.purpose !== purpose || !payload.sub) {
        throw new Error('Invalid token purpose');
      }

      return payload.sub;
    } catch {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid or expired token',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
