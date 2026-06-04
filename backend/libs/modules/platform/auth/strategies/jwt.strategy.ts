import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  BusinessMemberRole,
  BusinessStatus,
  MembershipStatus,
  PlatformMemberRole,
  UserStatus,
} from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { RootConfig } from '@app/core/config/configuration';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { PlatformMembershipRepository } from '../repositories/platform-membership.repository';
import { UserRepository } from '../repositories/user.repository';
import { resolvePlatformBusinessRole } from '../utils/platform-business-access.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService<RootConfig, true>,
    private readonly userRepository: UserRepository,
    private readonly platformMembershipRepository: PlatformMembershipRepository,
    private readonly businessMembershipRepository: BusinessMembershipRepository,
    private readonly businessRepository: BusinessRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.accessSecret', { infer: true }),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<RequestUser> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'User is not active',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (payload.context === 'platform') {
      const platformMembership =
        await this.platformMembershipRepository.findActiveByUserId(user.id);
      if (!platformMembership) {
        throw new AppException(
          ErrorCode.UNAUTHORIZED,
          'Platform access revoked',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return {
        id: user.id,
        email: user.email,
        context: 'platform',
        platformRole: platformMembership.role,
      };
    }

    if (!payload.businessId) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'Invalid business context',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const business = await this.businessRepository.findById(payload.businessId);
    if (!business || business.deletedAt) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (business.status !== BusinessStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.BUSINESS_SUSPENDED,
        'Business is not active',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const platformMembership =
      await this.platformMembershipRepository.findActiveByUserId(user.id);

    const membership =
      await this.businessMembershipRepository.findActiveByUserAndBusiness(
        user.id,
        payload.businessId,
      );

    if (platformMembership) {
      const businessRole = resolvePlatformBusinessRole(
        platformMembership.role,
        membership?.status === MembershipStatus.ACTIVE
          ? membership.role
          : null,
      );
      return {
        id: user.id,
        email: user.email,
        context: 'business',
        businessId: payload.businessId,
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
      businessId: payload.businessId,
      businessRole: membership.role,
    };
  }
}
