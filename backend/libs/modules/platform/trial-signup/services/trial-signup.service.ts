import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BusinessMemberRole,
  BusinessStatus,
  MembershipStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RootConfig } from '@app/core/config/configuration';
import { PrismaService } from '@app/core/database/prisma.service';
import { IndustriesService } from '@app/modules/crm/industries/services/industries.service';
import { PlatformSmsProvisioningService } from '@app/modules/integrations/twilio/services/platform-sms-provisioning.service';
import { AuthService } from '@app/modules/platform/auth/services/auth.service';
import { TokenService } from '@app/modules/platform/auth/services/token.service';
import { UserRepository } from '@app/modules/platform/auth/repositories/user.repository';
import { BusinessProvisioningService } from '@app/modules/platform/business/services/business-provisioning.service';
import {
  TRIAL_COMPLETE_LIMITS,
  type TrialSignupPayload,
} from '../constants/trial-signup.constants';
import {
  CreateOrUpdateTrialSessionDto,
  TrialCompleteDto,
} from '../dto/trial-signup.dto';
import { TrialSignupSessionRepository } from '../repositories/trial-signup-session.repository';
import { TrialOtpService } from './trial-otp.service';
import { normalizeUsE164Phone } from '../utils/us-e164-phone.util';

@Injectable()
export class TrialSignupService {
  constructor(
    private readonly sessions: TrialSignupSessionRepository,
    private readonly otp: TrialOtpService,
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
    private readonly industriesService: IndustriesService,
    private readonly provisioning: BusinessProvisioningService,
    private readonly tokenService: TokenService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly platformSmsProvisioning: PlatformSmsProvisioningService,
  ) {}

  async createOrUpdateSession(dto: CreateOrUpdateTrialSessionDto) {
    const incoming = (dto.payload ?? {}) as TrialSignupPayload;

    if (dto.sessionId) {
      const existing = await this.sessions.findActiveById(dto.sessionId);
      if (!existing) {
        throw new AppException(
          ErrorCode.NOT_FOUND,
          'Trial signup session expired. Please start again.',
          HttpStatus.NOT_FOUND,
        );
      }
      const prev = (existing.payload ?? {}) as TrialSignupPayload;
      const merged: TrialSignupPayload = { ...prev, ...incoming };
      const updated = await this.sessions.updatePayload(
        existing.id,
        merged as Prisma.InputJsonValue,
      );
      return {
        sessionId: updated.id,
        payload: updated.payload,
        expiresAt: updated.expiresAt.toISOString(),
      };
    }

    const created = await this.sessions.create(
      incoming as Prisma.InputJsonValue,
    );
    return {
      sessionId: created.id,
      payload: created.payload,
      expiresAt: created.expiresAt.toISOString(),
    };
  }

  async sendOtp(input: {
    phoneE164: string;
    sessionId?: string;
    ip: string;
  }) {
    const phone = normalizeUsE164Phone(input.phoneE164);
    if (!phone) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Enter a valid US phone number starting with +1',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.otp.assertSendOtpLimits({
      phoneE164: phone,
      ip: input.ip || 'unknown',
      sessionId: input.sessionId,
    });

    if (input.sessionId) {
      const session = await this.sessions.findActiveById(input.sessionId);
      if (session) {
        const prev = (session.payload ?? {}) as TrialSignupPayload;
        await this.sessions.updatePayload(session.id, {
          ...prev,
          phoneE164: phone,
        } as Prisma.InputJsonValue);
      }
    }

    return this.otp.sendOtp(phone);
  }

  async verifyOtp(input: { phoneE164: string; code: string; ip: string }) {
    const phone = normalizeUsE164Phone(input.phoneE164);
    if (!phone) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Enter a valid US phone number starting with +1',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.otp.assertVerifyOtpLimits({
      phoneE164: phone,
      ip: input.ip || 'unknown',
    });

    return this.otp.verifyOtp(phone, input.code);
  }

  async complete(dto: TrialCompleteDto, ip: string) {
    await this.otp.assertRateLimit(
      `trial:complete:ip:${ip || 'unknown'}`,
      TRIAL_COMPLETE_LIMITS.perIp,
    );
    if (dto.sessionId) {
      await this.otp.assertRateLimit(
        `trial:complete:session:${dto.sessionId}`,
        TRIAL_COMPLETE_LIMITS.perSession,
      );
    }

    const phoneE164 = await this.otp.verifyPhoneToken(
      dto.phoneVerificationToken,
    );

    const email = dto.email.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new AppException(
        ErrorCode.EMAIL_ALREADY_EXISTS,
        'Email already registered',
        HttpStatus.CONFLICT,
      );
    }

    const industry = await this.industriesService.resolveForBusiness();
    if (!industry) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No active industry is configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rounds = this.configService.get('auth.bcryptRounds', { infer: true });
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const website = dto.website?.trim() || null;
    const signupProfile = {
      servicesOffered: dto.servicesOffered,
      providerCountBand: dto.providerCountBand,
      source: 'embed',
    };

    const national = phoneE164.slice(2);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          status: UserStatus.ACTIVE,
          phoneE164,
          phoneVerifiedAt: new Date(),
        },
      });
      const business = await tx.business.create({
        data: {
          name: dto.businessName.trim(),
          industryId: industry.id,
          status: BusinessStatus.ACTIVE,
          createdById: user.id,
          website,
          phoneCountryCode: '+1',
          phoneNumber: national,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email,
          signupProfile,
        },
      });
      await tx.businessMembership.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: BusinessMemberRole.OWNER,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });
      return { user, business };
    });

    await this.provisioning.provisionAccess(result.business.id, {
      name: dto.businessName.trim(),
      accessMode: 'TRIAL',
      createdById: result.user.id,
    });

    void this.platformSmsProvisioning
      .ensurePlatformDefaultSms(result.business.id)
      .catch(() => undefined);

    await this.userRepository.updateLastLogin(result.user.id);

    if (dto.sessionId) {
      try {
        await this.sessions.deleteById(dto.sessionId);
      } catch {
        /* session may already be gone */
      }
    }

    const payload = {
      sub: result.user.id,
      email: result.user.email,
      context: 'business' as const,
      businessId: result.business.id,
      businessRole: BusinessMemberRole.OWNER,
    };

    const tokens = await this.tokenService.issueTokenPair(
      payload,
      'business',
      result.business.id,
    );

    const handoffCode = await this.otp.createHandoffCode({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId: result.user.id,
    });

    const frontendUrl = this.configService.get('app.frontendUrl', {
      infer: true,
    });
    const handoffUrl = `${frontendUrl}/auth/trial-handoff?code=${encodeURIComponent(handoffCode)}`;

    return { handoffUrl, businessId: result.business.id };
  }

  async exchangeHandoff(code: string) {
    const stored = await this.otp.consumeHandoffCode(code);
    const user = await this.userRepository.findById(stored.userId);
    if (!user) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid or expired handoff code',
        HttpStatus.BAD_REQUEST,
      );
    }
    return {
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
      contexts: await this.authService.buildContexts(user),
    };
  }

  getEmbedSnippet(): { scriptEmbed: string; iframeSrc: string } {
    const backendUrl = this.configService.get('app.backendPublicUrl', {
      infer: true,
    });
    const frontendUrl = this.configService.get('app.frontendUrl', {
      infer: true,
    });
    const apiBase = (backendUrl || '').replace(/\/$/, '');
    const appBase = (frontendUrl || '').replace(/\/$/, '');
    const iframeSrc = `${appBase}/widget/trial`;
    const scriptEmbed = `<script type="text/javascript" src="${apiBase}/embed/trial-widget.js"></script>
<iframe class="trial-signup-widget" src="${iframeSrc}" frameborder="0" scrolling="no" style="min-width:100%;width:100%;min-height:620px;border:0;overflow:hidden;" loading="lazy" title="Start trial"></iframe>`;
    return { scriptEmbed, iframeSrc };
  }

  async cleanupExpiredSessions(): Promise<number> {
    return this.sessions.deleteExpired();
  }
}
