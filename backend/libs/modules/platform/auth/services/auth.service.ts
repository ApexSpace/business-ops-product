import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BusinessMemberRole,
  BusinessStatus,
  MembershipStatus,
  PlatformMemberRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  AuthContext,
  RequestUser,
} from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { RootConfig } from '@app/core/config/configuration';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessAccessResolverService } from '@app/modules/platform/business/services/business-access-resolver.service';
import { mapAccessBlockToAuthError } from '@app/modules/platform/business/utils/business-access-auth.util';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';
import { PlatformMembershipRepository } from '../repositories/platform-membership.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import {
  UserRepository,
  UserWithRelations,
} from '../repositories/user.repository';
import { IndustriesService } from '@app/modules/crm/industries/services/industries.service';
import { SnapshotApplyService } from '@app/modules/platform/snapshots/services/snapshot-apply.service';
import { SnapshotsService } from '@app/modules/platform/snapshots/services/snapshots.service';
import { TokenService } from './token.service';
import { AuthActionTokenService } from './auth-action-token.service';
import { resolvePlatformBusinessRole } from '../utils/platform-business-access.util';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import { formatUserName } from '@app/modules/communications/email/utils/email-variables.util';

export interface AuthContextItem {
  type: AuthContext;
  businessId?: string;
  businessName?: string;
  platformRole?: string;
  businessRole?: string;
  /** Business opened via platform staff access (no direct membership). */
  viaPlatform?: boolean;
  canAccessWorkspace?: boolean;
  accessReasonCode?: string;
  accessReasonLabel?: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  contexts: AuthContextItem[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly platformMembershipRepository: PlatformMembershipRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly accessResolver: BusinessAccessResolverService,
    private readonly businessMembershipRepository: BusinessMembershipRepository,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly prisma: PrismaService,
    private readonly industriesService: IndustriesService,
    private readonly snapshotsService: SnapshotsService,
    private readonly snapshotApplyService: SnapshotApplyService,
    private readonly authActionTokenService: AuthActionTokenService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    businessName: string;
    industryId?: string;
    snapshotId?: string;
  }): Promise<AuthTokensResponse> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppException(
        ErrorCode.EMAIL_ALREADY_EXISTS,
        'Email already registered',
        HttpStatus.CONFLICT,
      );
    }

    const rounds = this.configService.get('auth.bcryptRounds', { infer: true });
    const passwordHash = await bcrypt.hash(input.password, rounds);
    const industry = await this.industriesService.resolveForBusiness(
      input.industryId,
    );

    if (!industry) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No active industry is configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const snapshot = await this.snapshotsService.resolveForBusiness(
      input.snapshotId,
    );

    if (!snapshot) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No published snapshot is configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          status: UserStatus.ACTIVE,
        },
      });
      const business = await tx.business.create({
        data: {
          name: input.businessName,
          industryId: industry.id,
          status: BusinessStatus.ACTIVE,
          createdById: user.id,
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

    await this.snapshotApplyService.apply(
      result.business.id,
      snapshot.id,
      result.user.id,
    );

    await this.userRepository.updateLastLogin(result.user.id);

    void this.sendEmailVerification(result.user.id).catch(() => undefined);

    const payload: JwtAccessPayload = {
      sub: result.user.id,
      email: result.user.email,
      context: 'business',
      businessId: result.business.id,
      businessRole: BusinessMemberRole.OWNER,
    };

    const tokens = await this.tokenService.issueTokenPair(
      payload,
      'business',
      result.business.id,
    );
    const userWithRelations = await this.userRepository.findById(
      result.user.id,
    );
    return {
      ...tokens,
      contexts: await this.buildContexts(userWithRelations!),
    };
  }

  async login(email: string, password: string): Promise<AuthTokensResponse> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppException(
        ErrorCode.ACCOUNT_SUSPENDED,
        'Account is suspended',
        HttpStatus.FORBIDDEN,
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.userRepository.updateLastLogin(user.id);
    const userWithRelations = await this.userRepository.findById(user.id);
    const contexts = await this.buildContexts(userWithRelations!);

    const defaultContext = this.pickDefaultContext(contexts);
    const payload = this.buildAccessPayload(
      userWithRelations!,
      defaultContext,
      contexts,
    );
    const tokens = await this.tokenService.issueTokenPair(
      payload,
      payload.context,
      payload.businessId,
    );

    return { ...tokens, contexts };
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const tokenHash = this.tokenService.hashToken(refreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (!stored) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.refreshTokenRepository.revoke(stored.id);

    const user = await this.userRepository.findById(stored.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.ACCOUNT_SUSPENDED,
        'Account is not active',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const contexts = await this.buildContexts(user);
    let payload: JwtAccessPayload;

    if (stored.contextType === 'business' && stored.businessId) {
      payload = await this.buildBusinessPayload(user.id, stored.businessId);
    } else if (stored.contextType === 'platform') {
      payload = this.buildPlatformPayload(user);
    } else {
      const defaultContext = this.pickDefaultContext(contexts);
      payload = this.buildAccessPayload(user, defaultContext, contexts);
    }

    const tokens = await this.tokenService.issueTokenPair(
      payload,
      payload.context,
      payload.businessId,
    );
    return { ...tokens, contexts };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.tokenService.hashToken(refreshToken);
      const stored =
        await this.refreshTokenRepository.findByTokenHash(tokenHash);
      if (stored && stored.userId === userId) {
        await this.refreshTokenRepository.revoke(stored.id);
        return;
      }
    }
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }

  async switchContext(
    userId: string,
    type: AuthContext,
    businessId?: string,
  ): Promise<AuthTokensResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.ACCOUNT_SUSPENDED,
        'Account is not active',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let payload: JwtAccessPayload;
    if (type === 'platform') {
      payload = this.buildPlatformPayload(user);
    } else {
      if (!businessId) {
        throw new AppException(
          ErrorCode.INVALID_CONTEXT,
          'businessId is required for business context',
          HttpStatus.BAD_REQUEST,
        );
      }
      payload = await this.buildBusinessPayload(userId, businessId);
    }

    const tokens = await this.tokenService.issueTokenPair(
      payload,
      payload.context,
      payload.businessId,
    );
    return { ...tokens, contexts: await this.buildContexts(user) };
  }

  async forgotPassword(email: string): Promise<{ sent: boolean }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalized);

    if (user && user.status === UserStatus.ACTIVE) {
      void this.sendPasswordReset(user.id).catch(() => undefined);
    }

    return { sent: true };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ reset: boolean }> {
    const userId = await this.authActionTokenService.verify(
      token,
      'password_reset',
    );
    const user = await this.userRepository.findById(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid or expired token',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rounds = this.configService.get('auth.bcryptRounds', { infer: true });
    const passwordHash = await bcrypt.hash(password, rounds);
    await this.userRepository.updatePassword(userId, passwordHash);
    await this.refreshTokenRepository.revokeAllForUser(userId);

    return { reset: true };
  }

  async verifyEmail(token: string): Promise<{ verified: boolean }> {
    const userId = await this.authActionTokenService.verify(
      token,
      'email_verification',
    );
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!user.emailVerifiedAt) {
      await this.userRepository.setEmailVerifiedAt(userId, new Date());
    }

    return { verified: true };
  }

  async resendEmailVerification(userId: string): Promise<{ sent: boolean }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.emailVerifiedAt) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Email is already verified',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.sendEmailVerification(userId);
    return { sent: true };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      contexts: await this.buildContexts(user),
    };
  }

  private async sendPasswordReset(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user?.email) {
      return;
    }

    const token = await this.authActionTokenService.sign(
      userId,
      'password_reset',
    );
    const frontendUrl = this.configService.get('app.frontendUrl', {
      infer: true,
    });
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId: null,
      emailType: 'auth.password_reset',
      toEmail: user.email,
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      idempotencyKey: `password-reset-${user.id}-${Date.now()}`,
      variables: {
        'user.name': formatUserName(user),
        'user.email': user.email,
        reset_link: resetLink,
      },
    });
  }

  private async sendEmailVerification(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user?.email || user.emailVerifiedAt) {
      return;
    }

    const token = await this.authActionTokenService.sign(
      userId,
      'email_verification',
    );
    const frontendUrl = this.configService.get('app.frontendUrl', {
      infer: true,
    });
    const verificationLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId: null,
      emailType: 'auth.email_verification',
      toEmail: user.email,
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      idempotencyKey: `email-verification-${user.id}`,
      variables: {
        'user.name': formatUserName(user),
        'user.email': user.email,
        verification_link: verificationLink,
      },
    });
  }

  async buildContexts(user: UserWithRelations): Promise<AuthContextItem[]> {
    const contexts: AuthContextItem[] = [];
    const hasPlatform = this.hasActivePlatformMembership(user);

    if (hasPlatform) {
      contexts.push({
        type: 'platform',
        platformRole: user.platformMembership!.role,
      });
    }

    const activeMemberships = user.businessMemberships.filter(
      (m) => m.status === MembershipStatus.ACTIVE && !m.business.deletedAt,
    );
    const membershipByBusinessId = new Map(
      activeMemberships.map((m) => [m.businessId, m]),
    );

    if (hasPlatform) {
      const businesses = await this.businessRepository.findAllNonDeleted();
      for (const business of businesses) {
        const membership = membershipByBusinessId.get(business.id);
        const resolution = await this.accessResolver.resolveForBusiness(
          business.id,
        );
        contexts.push({
          type: 'business',
          businessId: business.id,
          businessName: business.name,
          businessRole: membership?.role ?? BusinessMemberRole.ADMIN,
          viaPlatform: !membership,
          canAccessWorkspace: resolution.canAccessWorkspace,
          accessReasonCode: resolution.reasonCode,
          accessReasonLabel: resolution.reasonLabel,
        });
      }
      return contexts;
    }

    for (const m of activeMemberships) {
      const resolution = await this.accessResolver.resolveForBusiness(
        m.businessId,
      );
      contexts.push({
        type: 'business',
        businessId: m.businessId,
        businessName: m.business.name,
        businessRole: m.role,
        canAccessWorkspace: resolution.canAccessWorkspace,
        accessReasonCode: resolution.reasonCode,
        accessReasonLabel: resolution.reasonLabel,
      });
    }
    return contexts;
  }

  private hasActivePlatformMembership(user: UserWithRelations): boolean {
    return !!(user.platformMembership && !user.platformMembership.deletedAt);
  }

  private pickDefaultContext(contexts: AuthContextItem[]): AuthContext {
    const platform = contexts.find((c) => c.type === 'platform');
    if (platform) {
      return 'platform';
    }

    const accessibleBusiness = contexts.find(
      (c) => c.type === 'business' && c.canAccessWorkspace,
    );
    if (accessibleBusiness) {
      return 'business';
    }

    throw new AppException(
      ErrorCode.INVALID_CONTEXT,
      'No accessible workspace available',
      HttpStatus.FORBIDDEN,
    );
  }

  private buildAccessPayload(
    user: UserWithRelations,
    context: AuthContext,
    contexts: AuthContextItem[],
  ): JwtAccessPayload {
    if (context === 'platform') {
      return this.buildPlatformPayload(user);
    }

    const selected = contexts.find(
      (c) => c.type === 'business' && c.canAccessWorkspace,
    );

    if (!selected?.businessId) {
      throw new AppException(
        ErrorCode.INVALID_CONTEXT,
        'No accessible business workspace',
        HttpStatus.FORBIDDEN,
      );
    }

    const membership = user.businessMemberships.find(
      (m) =>
        m.businessId === selected.businessId &&
        m.status === MembershipStatus.ACTIVE &&
        !m.business.deletedAt,
    );

    if (this.hasActivePlatformMembership(user)) {
      const platformRole = user.platformMembership!.role;
      const businessRole = resolvePlatformBusinessRole(
        platformRole,
        membership?.role,
      );
      return {
        sub: user.id,
        email: user.email,
        context: 'business',
        businessId: selected.businessId,
        platformRole,
        businessRole,
      };
    }

    if (!membership) {
      throw new AppException(
        ErrorCode.INVALID_CONTEXT,
        'No active business membership',
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      sub: user.id,
      email: user.email,
      context: 'business',
      businessId: selected.businessId,
      businessRole: membership.role,
    };
  }

  private buildPlatformPayload(user: UserWithRelations): JwtAccessPayload {
    if (!user.platformMembership || user.platformMembership.deletedAt) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'No platform membership',
        HttpStatus.FORBIDDEN,
      );
    }
    return {
      sub: user.id,
      email: user.email,
      context: 'platform',
      platformRole: user.platformMembership.role,
    };
  }

  private async buildBusinessPayload(
    userId: string,
    businessId: string,
  ): Promise<JwtAccessPayload> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business || business.deletedAt) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const resolution = await this.accessResolver.resolveForBusiness(businessId);
    if (!resolution.canAccessWorkspace) {
      const { code, message } = mapAccessBlockToAuthError(
        business.status,
        resolution.reasonCode,
      );
      throw new AppException(code, message, HttpStatus.FORBIDDEN);
    }

    const membership =
      await this.businessMembershipRepository.findActiveByUserAndBusiness(
        userId,
        businessId,
      );

    if (this.hasActivePlatformMembership(user)) {
      const platformRole = user.platformMembership!.role;
      const businessRole = resolvePlatformBusinessRole(
        platformRole,
        membership?.role,
      );
      return {
        sub: userId,
        email: user.email,
        context: 'business',
        businessId,
        platformRole,
        businessRole,
      };
    }

    if (!membership) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_NOT_FOUND,
        'Active business membership not found',
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      sub: userId,
      email: user.email,
      context: 'business',
      businessId,
      businessRole: membership.role,
    };
  }
}
