import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthContextType } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AuthContext } from '@app/common/decorators/current-user.decorator';
import { RootConfig } from '@app/core/config/configuration';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issueTokenPair(
    payload: JwtAccessPayload,
    contextType?: AuthContext,
    businessId?: string,
  ): Promise<TokenPair> {
    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.createRefreshToken(
      payload.sub,
      contextType,
      businessId,
    );
    return { accessToken, refreshToken };
  }

  private signAccessToken(payload: JwtAccessPayload): Promise<string> {
    const secret = this.configService.get('jwt.accessSecret', { infer: true });
    const expiresIn = this.configService.get('jwt.accessExpiresIn', {
      infer: true,
    });
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
  }

  private async createRefreshToken(
    userId: string,
    contextType?: AuthContext,
    businessId?: string,
  ): Promise<string> {
    const rawToken = randomUUID();
    const tokenHash = this.hashToken(rawToken);
    const expiresIn = this.configService.get('jwt.refreshExpiresIn', {
      infer: true,
    });
    const expiresAt = this.parseExpiry(expiresIn);

    await this.refreshTokenRepository.create({
      userId,
      tokenHash,
      expiresAt,
      contextType: contextType as AuthContextType | undefined,
      businessId,
    });

    return rawToken;
  }

  private parseExpiry(expiresIn: string): Date {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return new Date(Date.now() + value * (multipliers[unit] ?? 1000));
  }
}
