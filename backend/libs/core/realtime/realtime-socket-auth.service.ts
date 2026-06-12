import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  MembershipStatus,
  UserStatus,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { RootConfig } from '@app/core/config/configuration';
import { JwtAccessPayload } from '@app/modules/platform/auth/interfaces/jwt-payload.interface';
import { UserRepository } from '@app/modules/platform/auth/repositories/user.repository';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessAccessResolverService } from '@app/modules/platform/business/services/business-access-resolver.service';
import { mapAccessBlockToAuthError } from '@app/modules/platform/business/utils/business-access-auth.util';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { PlatformMembershipRepository } from '@app/modules/platform/auth/repositories/platform-membership.repository';
import { resolvePlatformBusinessRole } from '@app/modules/platform/auth/utils/platform-business-access.util';

@Injectable()
export class RealtimeSocketAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly userRepository: UserRepository,
    private readonly platformMembershipRepository: PlatformMembershipRepository,
    private readonly businessMembershipRepository: BusinessMembershipRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly accessResolver: BusinessAccessResolverService,
  ) {}

  async authenticateHandshake(
    token: string,
    requestedBusinessId: string,
  ): Promise<RequestUser> {
    const trimmedToken = token.trim();
    const businessId = requestedBusinessId.trim();

    if (!trimmedToken || !businessId) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'Missing realtime credentials',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let payload: JwtAccessPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtAccessPayload>(trimmedToken, {
        secret: this.configService.get('jwt.accessSecret', { infer: true }),
      });
    } catch {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'Invalid access token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (payload.context === 'platform') {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'Switch to a business context before connecting to realtime',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!payload.businessId || payload.businessId !== businessId) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Business context mismatch',
        HttpStatus.FORBIDDEN,
      );
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'User is not active',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business || business.deletedAt) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.UNAUTHORIZED,
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

    const platformMembership =
      await this.platformMembershipRepository.findActiveByUserId(user.id);

    const membership =
      await this.businessMembershipRepository.findActiveByUserAndBusiness(
        user.id,
        businessId,
      );

    if (platformMembership) {
      const businessRole = resolvePlatformBusinessRole(
        platformMembership.role,
        membership?.status === MembershipStatus.ACTIVE ? membership.role : null,
      );
      return {
        id: user.id,
        email: user.email,
        context: 'business',
        businessId,
        platformRole: platformMembership.role,
        businessRole,
      };
    }

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_SUSPENDED,
        'Membership is not active',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      id: user.id,
      email: user.email,
      context: 'business',
      businessId,
      businessRole: membership.role,
    };
  }
}
