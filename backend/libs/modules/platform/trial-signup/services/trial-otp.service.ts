import { createHash, randomInt, randomUUID } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RootConfig } from '@app/core/config/configuration';
import { RedisService } from '@app/core/redis/redis.service';
import { TwilioApiClient } from '@app/modules/integrations/twilio/services/twilio-api-client';
import { SmsModeResolverService } from '@app/modules/integrations/twilio/services/sms-mode-resolver.service';
import {
  TRIAL_HANDOFF_TTL_SEC,
  TRIAL_OTP_TTL_SEC,
  TRIAL_PHONE_TOKEN_TTL,
  TRIAL_RATE_WINDOW_SEC,
  TRIAL_SEND_OTP_LIMITS,
  TRIAL_VERIFY_OTP_LIMITS,
} from '../constants/trial-signup.constants';

export type TrialPhoneTokenPayload = {
  sub: string;
  purpose: 'trial_phone_verified';
  phoneE164: string;
};

export type TrialHandoffPayload = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

@Injectable()
export class TrialOtpService {
  constructor(
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly twilioApiClient: TwilioApiClient,
    private readonly smsModeResolver: SmsModeResolverService,
  ) {}

  private requireRedis() {
    const client = this.redis.getClient();
    if (!client) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Verification service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return client;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  async assertRateLimit(
    key: string,
    limit: number,
    windowSec = TRIAL_RATE_WINDOW_SEC,
  ): Promise<void> {
    const client = this.requireRedis();
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSec);
    }
    if (count > limit) {
      throw new AppException(
        ErrorCode.RATE_LIMITED,
        'Too many attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async assertSendOtpLimits(params: {
    phoneE164: string;
    ip: string;
    sessionId?: string;
  }): Promise<void> {
    await this.assertRateLimit(
      `trial:otp:send:phone:${params.phoneE164}`,
      TRIAL_SEND_OTP_LIMITS.perPhone,
    );
    await this.assertRateLimit(
      `trial:otp:send:ip:${params.ip}`,
      TRIAL_SEND_OTP_LIMITS.perIp,
    );
    if (params.sessionId) {
      await this.assertRateLimit(
        `trial:otp:send:session:${params.sessionId}`,
        TRIAL_SEND_OTP_LIMITS.perSession,
      );
    }
  }

  async assertVerifyOtpLimits(params: {
    phoneE164: string;
    ip: string;
  }): Promise<void> {
    await this.assertRateLimit(
      `trial:otp:verify:phone:${params.phoneE164}`,
      TRIAL_VERIFY_OTP_LIMITS.perPhone,
    );
    await this.assertRateLimit(
      `trial:otp:verify:ip:${params.ip}`,
      TRIAL_VERIFY_OTP_LIMITS.perIp,
    );
  }

  async sendOtp(phoneE164: string): Promise<{ sent: true }> {
    const ctx = this.smsModeResolver.resolvePlatformNotification();
    if (!ctx) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'SMS verification is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const code = String(randomInt(100000, 999999));
    const client = this.requireRedis();
    await client.set(
      `trial:otp:code:${phoneE164}`,
      this.hash(code),
      'EX',
      TRIAL_OTP_TTL_SEC,
    );

    await this.twilioApiClient.sendMessage({
      accountSid: ctx.accountSid,
      authToken: ctx.authToken,
      from: ctx.fromNumber,
      to: phoneE164,
      body: `Your verification code is ${code}. It expires in 10 minutes.`,
    });

    return { sent: true };
  }

  async verifyOtp(
    phoneE164: string,
    code: string,
  ): Promise<{ phoneVerificationToken: string }> {
    const client = this.requireRedis();
    const key = `trial:otp:code:${phoneE164}`;
    const stored = await client.get(key);
    if (!stored || stored !== this.hash(code.trim())) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid or expired verification code',
        HttpStatus.BAD_REQUEST,
      );
    }
    await client.del(key);

    const secret = this.configService.get('jwt.accessSecret', { infer: true });
    const phoneVerificationToken = await this.jwtService.signAsync(
      {
        sub: phoneE164,
        purpose: 'trial_phone_verified',
        phoneE164,
      } satisfies TrialPhoneTokenPayload,
      {
        secret,
        expiresIn: TRIAL_PHONE_TOKEN_TTL,
      },
    );

    return { phoneVerificationToken };
  }

  async verifyPhoneToken(token: string, expectedPhone?: string): Promise<string> {
    const secret = this.configService.get('jwt.accessSecret', { infer: true });
    try {
      const payload =
        await this.jwtService.verifyAsync<TrialPhoneTokenPayload>(token, {
          secret,
        });
      if (
        payload.purpose !== 'trial_phone_verified' ||
        !payload.phoneE164
      ) {
        throw new Error('invalid');
      }
      if (expectedPhone && payload.phoneE164 !== expectedPhone) {
        throw new Error('mismatch');
      }
      return payload.phoneE164;
    } catch {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Phone verification expired. Please verify your number again.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createHandoffCode(payload: TrialHandoffPayload): Promise<string> {
    const client = this.requireRedis();
    const code = randomUUID();
    await client.set(
      `trial:handoff:${code}`,
      JSON.stringify(payload),
      'EX',
      TRIAL_HANDOFF_TTL_SEC,
    );
    return code;
  }

  async consumeHandoffCode(code: string): Promise<TrialHandoffPayload> {
    const client = this.requireRedis();
    const key = `trial:handoff:${code}`;
    const raw = await client.get(key);
    if (!raw) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid or expired handoff code',
        HttpStatus.BAD_REQUEST,
      );
    }
    await client.del(key);
    return JSON.parse(raw) as TrialHandoffPayload;
  }
}
